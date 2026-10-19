import { TestBed } from '@angular/core/testing';

import {
  FormDocumentRepository,
  FORM_DOCUMENT_STORAGE,
} from '../../core/storage/form-document.repository';
import { createBlankDocument } from '../../domain/form-document/form-document.factory';
import { BuilderStore } from './builder.store';

describe('BuilderStore', () => {
  let store: BuilderStore;
  let repository: FormDocumentRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BuilderStore,
        FormDocumentRepository,
        { provide: FORM_DOCUMENT_STORAGE, useValue: createMemoryStorage() },
      ],
    });
    store = TestBed.inject(BuilderStore);
    repository = TestBed.inject(FormDocumentRepository);
    const document = createBlankDocument('Builder test');
    repository.save(document);
    expect(store.load(document.id)).toBe(true);
  });

  it('adds fields with unique keys and persists changes', () => {
    const first = store.addField('text');
    const second = store.addField('text');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first?.key).toBe('shortText');
    expect(second?.key).toBe('shortText2');

    if (!second) return;
    store.updateField(second.id, { key: 'shortText' });
    expect(store.selectedField()?.key).toBe('shortText2');

    store.saveNow();
    expect(repository.get(store.document()!.id)?.fields).toHaveLength(2);
  });

  it('removes conditions that reference a deleted source field', () => {
    const source = store.addField('toggle');
    const dependent = store.addField('text');
    if (!source || !dependent) throw new Error('Expected fields to be created.');

    store.setCondition(dependent.id, {
      action: 'show',
      sourceFieldId: source.id,
      operator: 'equals',
      value: true,
    });
    expect(store.selectedField()?.condition?.sourceFieldId).toBe(source.id);

    store.deleteField(source.id);
    expect(
      store.document()?.fields.find((field) => field.id === dependent.id)?.condition,
    ).toBeUndefined();
  });

  it('supports reorder, undo, and redo snapshots', () => {
    const first = store.addField('text');
    const second = store.addField('email');
    if (!first || !second) throw new Error('Expected fields to be created.');

    store.reorderField(0, 1);
    expect(store.document()?.fields.map((field) => field.id)).toEqual([second.id, first.id]);

    store.undo();
    expect(store.document()?.fields.map((field) => field.id)).toEqual([first.id, second.id]);
    expect(store.canRedo()).toBe(true);

    store.redo();
    expect(store.document()?.fields.map((field) => field.id)).toEqual([second.id, first.id]);
  });

  it('updates form settings and manages choice-field options', () => {
    store.updateDocument({
      description: 'Updated description',
      locale: 'ru',
      submitLabel: 'Отправить',
    });
    const choice = store.addField('select');
    if (!choice) throw new Error('Expected a select field.');

    store.addOption(choice.id);
    let selected = store.selectedField();
    expect(selected?.options).toHaveLength(3);
    const addedOption = selected!.options[2];
    store.updateOption(choice.id, addedOption.id, { label: 'Priority', value: 'priority' });
    selected = store.selectedField();
    expect(selected?.options[2]).toMatchObject({ label: 'Priority', value: 'priority' });

    store.removeOption(choice.id, addedOption.id);
    expect(store.selectedField()?.options).toHaveLength(2);
    expect(store.document()).toMatchObject({
      description: 'Updated description',
      locale: 'ru',
      submitLabel: 'Отправить',
    });
  });

  it('duplicates a choice field with independent option ids', () => {
    const source = store.addField('radio');
    if (!source) throw new Error('Expected a radio field.');
    store.duplicateField(source.id);

    const [original, duplicate] = store.document()!.fields;
    expect(duplicate.label).toBe('Radio group copy');
    expect(duplicate.key).toBe('radioGroup2');
    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.options.map((option) => option.id)).not.toEqual(
      original.options.map((option) => option.id),
    );
  });

  it('ignores invalid moves and unknown field ids', () => {
    const field = store.addField('text');
    if (!field) throw new Error('Expected a field.');
    const snapshot = structuredClone(store.document());

    store.moveField(field.id, -1);
    store.reorderField(-1, 0);
    store.reorderField(0, 99);
    store.duplicateField('missing');
    store.deleteField('missing');
    store.addOption('missing');
    store.updateOption('missing', 'missing', { label: 'No-op' });
    store.removeOption('missing', 'missing');

    expect(store.document()?.fields).toEqual(snapshot?.fields);
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
