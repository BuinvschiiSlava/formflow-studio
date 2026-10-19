import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';

import { serializeFormDocument } from '../export/form-document-export';
import {
  importFormDocumentJson,
  parseFormDocument,
} from '../../domain/form-document/form-document.import';
import { FormDocument } from '../../domain/form-document/form-document.model';

export const FORM_DOCUMENTS_STORAGE_KEY = 'formflow-studio.documents.v1';

export const FORM_DOCUMENT_STORAGE = new InjectionToken<Storage | undefined>(
  'FormFlow Studio local storage',
  {
    providedIn: 'root',
    factory: () => {
      try {
        return inject(DOCUMENT).defaultView?.localStorage;
      } catch {
        return undefined;
      }
    },
  },
);

function orderDocuments(documents: readonly FormDocument[]): FormDocument[] {
  return [...documents].sort(
    (left, right) =>
      Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || left.id.localeCompare(right.id),
  );
}

function serializeCollection(documents: readonly FormDocument[]): string {
  const values = orderDocuments(documents).map(
    (document) => JSON.parse(serializeFormDocument(document)) as unknown,
  );
  return JSON.stringify(values);
}

@Injectable({ providedIn: 'root' })
export class FormDocumentRepository {
  private readonly storage = inject(FORM_DOCUMENT_STORAGE);
  readonly storageError = signal<string | null>(null);

  list(): FormDocument[] {
    if (!this.storage) {
      this.storageError.set('Browser storage is unavailable. Export your form to keep a backup.');
      return [];
    }

    let raw: string | null;
    try {
      raw = this.storage.getItem(FORM_DOCUMENTS_STORAGE_KEY);
    } catch {
      this.storageError.set('Could not read saved forms from browser storage.');
      return [];
    }
    if (raw === null) {
      this.storageError.set(null);
      return [];
    }

    let values: unknown;
    try {
      values = JSON.parse(raw) as unknown;
    } catch {
      this.storageError.set('Saved form data is corrupted and could not be parsed.');
      return [];
    }
    if (!Array.isArray(values)) {
      this.storageError.set('Saved form data has an unsupported format.');
      return [];
    }

    const documents: FormDocument[] = [];
    const ids = new Set<string>();
    for (const value of values) {
      const result = parseFormDocument(value);
      if (!result.ok) {
        this.storageError.set('A saved form is invalid. Import a known-good backup to recover it.');
        return [];
      }
      if (ids.has(result.document.id)) {
        this.storageError.set('Saved form data contains duplicate document identifiers.');
        return [];
      }
      ids.add(result.document.id);
      documents.push(result.document);
    }

    this.storageError.set(null);
    return orderDocuments(documents).map((document) => structuredClone(document));
  }

  get(id: string): FormDocument | undefined {
    const document = this.list().find((candidate) => candidate.id === id);
    return document ? structuredClone(document) : undefined;
  }

  save(document: FormDocument): void {
    const validation = parseFormDocument(document);
    if (!validation.ok) {
      const details = validation.issues
        .slice(0, 3)
        .map((entry) => `${entry.path}: ${entry.message}`)
        .join('; ');
      throw new TypeError(`Cannot save an invalid form document. ${details}`);
    }

    const documents = this.list();
    if (this.storageError() !== null && documents.length === 0) return;
    const index = documents.findIndex((candidate) => candidate.id === document.id);
    if (index === -1) documents.push(validation.document);
    else documents[index] = validation.document;
    this.write(documents);
  }

  remove(id: string): void {
    const documents = this.list();
    if (this.storageError() !== null && documents.length === 0) return;
    this.write(documents.filter((document) => document.id !== id));
  }

  replaceAll(documents: FormDocument[]): void {
    const ids = new Set<string>();
    const validated = documents.map((document) => {
      const result = parseFormDocument(document);
      if (!result.ok) {
        throw new TypeError(`Cannot persist invalid form document "${document.id}".`);
      }
      if (ids.has(result.document.id)) {
        throw new TypeError(`Duplicate form document id "${result.document.id}".`);
      }
      ids.add(result.document.id);
      return result.document;
    });
    this.write(validated);
  }

  /** Imports a single document using the same strict path as the file importer. */
  import(json: string): FormDocument | undefined {
    const result = importFormDocumentJson(json);
    if (!result.ok) {
      this.storageError.set(
        result.issues[0]?.message ?? 'The selected form document could not be imported.',
      );
      return undefined;
    }
    this.save(result.document);
    return structuredClone(result.document);
  }

  private write(documents: readonly FormDocument[]): void {
    if (!this.storage) {
      this.storageError.set('Browser storage is unavailable. Export your form to keep a backup.');
      return;
    }
    try {
      this.storage.setItem(FORM_DOCUMENTS_STORAGE_KEY, serializeCollection(documents));
      this.storageError.set(null);
    } catch {
      this.storageError.set(
        'Could not save forms. Browser storage may be full or blocked; export a backup.',
      );
    }
  }
}
