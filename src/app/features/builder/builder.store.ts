import { Injectable, computed, inject, signal } from '@angular/core';

import {
  createField,
  createId,
  uniqueFieldKey,
} from '../../domain/form-document/form-document.factory';
import {
  FieldCondition,
  FieldOption,
  FormDocument,
  FormFieldNode,
  FormFieldType,
} from '../../domain/form-document/form-document.model';
import { FormDocumentRepository } from '../../core/storage/form-document.repository';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Injectable()
export class BuilderStore {
  private readonly repository = inject(FormDocumentRepository);
  private readonly documentState = signal<FormDocument | null>(null);
  private readonly selectedFieldIdState = signal<string | null>(null);
  private readonly past = signal<FormDocument[]>([]);
  private readonly future = signal<FormDocument[]>([]);
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  readonly document = this.documentState.asReadonly();
  readonly selectedFieldId = this.selectedFieldIdState.asReadonly();
  readonly saveState = signal<SaveState>('idle');
  readonly announcement = signal('');
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);
  readonly selectedField = computed(() => {
    const document = this.documentState();
    const id = this.selectedFieldIdState();
    return document?.fields.find((field) => field.id === id) ?? null;
  });

  load(id: string): boolean {
    const document = this.repository.get(id);
    if (!document) return false;
    this.documentState.set(document);
    this.selectedFieldIdState.set(document.fields[0]?.id ?? null);
    this.past.set([]);
    this.future.set([]);
    this.saveState.set('saved');
    return true;
  }

  selectField(id: string | null): void {
    this.selectedFieldIdState.set(id);
  }

  updateDocument(
    patch: Partial<Pick<FormDocument, 'title' | 'description' | 'locale' | 'submitLabel'>>,
  ): void {
    this.commit((document) => ({ ...document, ...patch }));
  }

  addField(type: FormFieldType, index?: number): FormFieldNode | undefined {
    const document = this.documentState();
    if (!document) return undefined;
    const field = createField(type, document.fields);
    this.commit((current) => {
      const fields = [...current.fields];
      fields.splice(index ?? fields.length, 0, field);
      return { ...current, fields };
    });
    this.selectedFieldIdState.set(field.id);
    this.say(`${field.label} added.`);
    return field;
  }

  updateField(id: string, patch: Partial<FormFieldNode>): void {
    this.commit((document) => {
      const fields = document.fields.map((field) => {
        if (field.id !== id) return field;
        const next = { ...field, ...patch };
        if (patch.key !== undefined) {
          next.key = uniqueFieldKey(patch.key, document.fields, id);
        }
        return next;
      });
      return { ...document, fields };
    });
  }

  duplicateField(id: string): void {
    const document = this.documentState();
    const sourceIndex = document?.fields.findIndex((field) => field.id === id) ?? -1;
    if (!document || sourceIndex < 0) return;
    const source = document.fields[sourceIndex];
    const duplicate: FormFieldNode = {
      ...structuredClone(source),
      id: createId('field'),
      key: uniqueFieldKey(source.key, document.fields),
      label: `${source.label} copy`,
      options: source.options.map((option) => ({ ...option, id: createId('option') })),
    };
    this.commit((current) => {
      const fields = [...current.fields];
      fields.splice(sourceIndex + 1, 0, duplicate);
      return { ...current, fields };
    });
    this.selectedFieldIdState.set(duplicate.id);
    this.say(`${source.label} duplicated.`);
  }

  deleteField(id: string): void {
    const document = this.documentState();
    const index = document?.fields.findIndex((field) => field.id === id) ?? -1;
    if (!document || index < 0) return;
    const label = document.fields[index].label;
    this.commit((current) => ({
      ...current,
      fields: current.fields
        .filter((field) => field.id !== id)
        .map((field) =>
          field.condition?.sourceFieldId === id ? { ...field, condition: undefined } : field,
        ),
    }));
    const remaining = this.documentState()?.fields ?? [];
    this.selectedFieldIdState.set(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
    this.say(`${label} deleted.`);
  }

  moveField(id: string, direction: -1 | 1): void {
    const document = this.documentState();
    const from = document?.fields.findIndex((field) => field.id === id) ?? -1;
    if (!document || from < 0) return;
    const to = Math.max(0, Math.min(document.fields.length - 1, from + direction));
    if (from === to) return;
    this.reorderField(from, to);
  }

  reorderField(from: number, to: number): void {
    const document = this.documentState();
    if (
      !document ||
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= document.fields.length ||
      to >= document.fields.length
    )
      return;
    const label = document.fields[from].label;
    this.commit((current) => {
      const fields = [...current.fields];
      const [moved] = fields.splice(from, 1);
      fields.splice(to, 0, moved);
      return { ...current, fields };
    });
    this.say(`${label} moved to position ${to + 1}.`);
  }

  addOption(fieldId: string): void {
    const field = this.documentState()?.fields.find((candidate) => candidate.id === fieldId);
    if (!field) return;
    const nextNumber = field.options.length + 1;
    const option: FieldOption = {
      id: createId('option'),
      label: `Option ${nextNumber}`,
      value: `option-${nextNumber}`,
    };
    this.updateField(fieldId, { options: [...field.options, option] });
  }

  updateOption(fieldId: string, optionId: string, patch: Partial<FieldOption>): void {
    const field = this.documentState()?.fields.find((candidate) => candidate.id === fieldId);
    if (!field) return;
    this.updateField(fieldId, {
      options: field.options.map((option) =>
        option.id === optionId ? { ...option, ...patch } : option,
      ),
    });
  }

  removeOption(fieldId: string, optionId: string): void {
    const field = this.documentState()?.fields.find((candidate) => candidate.id === fieldId);
    if (!field || field.options.length <= 1) return;
    this.updateField(fieldId, {
      options: field.options.filter((option) => option.id !== optionId),
    });
  }

  setCondition(fieldId: string, condition?: FieldCondition): void {
    this.updateField(fieldId, { condition });
  }

  undo(): void {
    const previous = this.past().at(-1);
    const current = this.documentState();
    if (!previous || !current) return;
    this.past.update((history) => history.slice(0, -1));
    this.future.update((history) => [structuredClone(current), ...history].slice(0, 50));
    this.documentState.set(structuredClone(previous));
    this.ensureSelection();
    this.scheduleSave();
    this.say('Last change undone.');
  }

  redo(): void {
    const [next, ...rest] = this.future();
    const current = this.documentState();
    if (!next || !current) return;
    this.future.set(rest);
    this.past.update((history) => [...history, structuredClone(current)].slice(-50));
    this.documentState.set(structuredClone(next));
    this.ensureSelection();
    this.scheduleSave();
    this.say('Change restored.');
  }

  saveNow(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    const document = this.documentState();
    if (!document) return;
    this.saveState.set('saving');
    try {
      this.repository.save(document);
      this.saveState.set(this.repository.storageError() ? 'error' : 'saved');
    } catch {
      this.saveState.set('error');
    }
  }

  private commit(update: (document: FormDocument) => FormDocument): void {
    const current = this.documentState();
    if (!current) return;
    this.past.update((history) => [...history, structuredClone(current)].slice(-50));
    this.future.set([]);
    this.documentState.set({
      ...update(structuredClone(current)),
      updatedAt: new Date().toISOString(),
    });
    this.scheduleSave();
  }

  private scheduleSave(): void {
    this.saveState.set('saving');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 450);
  }

  private ensureSelection(): void {
    const fields = this.documentState()?.fields ?? [];
    if (!fields.some((field) => field.id === this.selectedFieldIdState())) {
      this.selectedFieldIdState.set(fields[0]?.id ?? null);
    }
  }

  private say(message: string): void {
    this.announcement.set('');
    queueMicrotask(() => this.announcement.set(message));
  }
}
