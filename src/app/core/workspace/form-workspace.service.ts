import { Injectable, computed, inject, signal } from '@angular/core';

import { importFormDocumentJson } from '../../domain/form-document/form-document.import';
import {
  cloneDocument,
  createBlankDocument,
} from '../../domain/form-document/form-document.factory';
import { FormDocument, ImportResult } from '../../domain/form-document/form-document.model';
import { FormDocumentRepository } from '../storage/form-document.repository';
import { FormTemplateId, createDocumentFromTemplate } from '../templates';

@Injectable({ providedIn: 'root' })
export class FormWorkspaceService {
  private readonly repository = inject(FormDocumentRepository);
  private readonly documentsState = signal<FormDocument[]>([]);

  readonly documents = this.documentsState.asReadonly();
  readonly documentCount = computed(() => this.documentsState().length);
  readonly storageError = this.repository.storageError;

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.documentsState.set(this.repository.list());
  }

  create(title = 'Untitled form'): FormDocument {
    const document = createBlankDocument(title);
    this.repository.save(document);
    this.refresh();
    return document;
  }

  createFromTemplate(templateId: FormTemplateId): FormDocument {
    const document = createDocumentFromTemplate(templateId);
    this.repository.save(document);
    this.refresh();
    return document;
  }

  duplicate(document: FormDocument): FormDocument {
    const copy = cloneDocument(document);
    this.repository.save(copy);
    this.refresh();
    return copy;
  }

  remove(id: string): void {
    this.repository.remove(id);
    this.refresh();
  }

  importJson(json: string): ImportResult {
    const parsed = importFormDocumentJson(json);
    if (!parsed.ok) return parsed;

    // An import is always a new draft. This prevents an uploaded file from
    // silently overwriting a local form that happens to share its id.
    const document = cloneDocument(parsed.document, parsed.document.title);
    this.repository.save(document);
    this.refresh();
    return { ok: true, document };
  }
}
