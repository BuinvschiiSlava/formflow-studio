import { TestBed } from '@angular/core/testing';

import { serializeFormDocument } from '../export/form-document-export';
import { FORM_DOCUMENT_STORAGE } from '../storage/form-document.repository';
import { createBlankDocument } from '../../domain/form-document/form-document.factory';
import { FormWorkspaceService } from './form-workspace.service';

describe('FormWorkspaceService', () => {
  let workspace: FormWorkspaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FormWorkspaceService,
        { provide: FORM_DOCUMENT_STORAGE, useValue: createMemoryStorage() },
      ],
    });
    workspace = TestBed.inject(FormWorkspaceService);
  });

  it('imports a valid document as a separate draft', () => {
    const source = createBlankDocument('Imported form');
    const result = workspace.importJson(serializeFormDocument(source));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.id).not.toBe(source.id);
    expect(result.document.title).toBe(source.title);
    expect(workspace.documents()).toHaveLength(1);
  });

  it('does not mutate the workspace when import validation fails', () => {
    workspace.create('Keep me');
    const before = workspace.documents();
    const result = workspace.importJson('{invalid');

    expect(result.ok).toBe(false);
    expect(workspace.documents()).toEqual(before);
  });

  it('creates, duplicates, and removes independent drafts', () => {
    const created = workspace.create('Blank draft');
    const copy = workspace.duplicate(created);
    const template = workspace.createFromTemplate('api-access-request');

    expect(workspace.documentCount()).toBe(3);
    expect(copy.id).not.toBe(created.id);
    expect(copy.title).toBe('Blank draft copy');
    expect(template.fields.length).toBeGreaterThan(5);

    workspace.remove(created.id);
    expect(workspace.documents().map((document) => document.id)).not.toContain(created.id);
    expect(workspace.documentCount()).toBe(2);
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
