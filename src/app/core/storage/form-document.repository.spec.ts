import { TestBed } from '@angular/core/testing';

import {
  FORM_DOCUMENT_SCHEMA_VERSION,
  FormDocument,
} from '../../domain/form-document/form-document.model';
import {
  FORM_DOCUMENT_STORAGE,
  FORM_DOCUMENTS_STORAGE_KEY,
  FormDocumentRepository,
} from './form-document.repository';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function documentFixture(id: string, updatedAt: string): FormDocument {
  return {
    schemaVersion: FORM_DOCUMENT_SCHEMA_VERSION,
    id: `form_${id}`,
    title: id,
    description: '',
    locale: 'en',
    submitLabel: 'Submit',
    fields: [],
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt,
  };
}

describe('FormDocumentRepository', () => {
  let storage: MemoryStorage;
  let repository: FormDocumentRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [FormDocumentRepository, { provide: FORM_DOCUMENT_STORAGE, useValue: storage }],
    });
    repository = TestBed.inject(FormDocumentRepository);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('saves, replaces, lists and removes documents', () => {
    const older = documentFixture('older', '2026-10-19T11:00:00.000Z');
    const newer = documentFixture('newer', '2026-10-19T12:00:00.000Z');
    repository.save(older);
    repository.save(newer);

    expect(repository.list().map((document) => document.id)).toEqual(['form_newer', 'form_older']);

    repository.save({ ...older, title: 'Updated' });
    expect(repository.get('form_older')?.title).toBe('Updated');

    repository.remove('form_newer');
    expect(repository.list().map((document) => document.id)).toEqual(['form_older']);
    expect(repository.storageError()).toBeNull();
  });

  it('returns defensive clones', () => {
    repository.save(documentFixture('one', '2026-10-19T11:00:00.000Z'));
    const first = repository.get('form_one');
    if (!first) throw new Error('Expected saved document');
    first.title = 'Mutated outside repository';

    expect(repository.get('form_one')?.title).toBe('one');
  });

  it('does not overwrite corrupt storage', () => {
    storage.setItem(FORM_DOCUMENTS_STORAGE_KEY, '{broken');
    repository.save(documentFixture('one', '2026-10-19T11:00:00.000Z'));

    expect(storage.getItem(FORM_DOCUMENTS_STORAGE_KEY)).toBe('{broken');
    expect(repository.storageError()).toContain('corrupted');
  });

  it('reports quota or blocked-storage errors', () => {
    storage.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    repository.save(documentFixture('one', '2026-10-19T11:00:00.000Z'));

    expect(repository.storageError()).toContain('Could not save');
  });

  it('atomically validates replaceAll and rejects duplicate document ids', () => {
    const document = documentFixture('one', '2026-10-19T11:00:00.000Z');
    expect(() => repository.replaceAll([document, document])).toThrowError(
      /Duplicate form document id/,
    );
    expect(repository.list()).toEqual([]);
  });

  it('replaces the collection and imports a valid JSON document', () => {
    const first = documentFixture('first', '2026-10-19T11:00:00.000Z');
    const second = documentFixture('second', '2026-10-19T12:00:00.000Z');
    repository.replaceAll([first]);
    expect(repository.list().map((document) => document.id)).toEqual(['form_first']);

    const imported = repository.import(JSON.stringify(second));
    expect(imported?.id).toBe('form_second');
    expect(repository.list().map((document) => document.id)).toEqual(['form_second', 'form_first']);
  });

  it('reports unsupported, invalid, and unreadable stored collections', () => {
    storage.setItem(FORM_DOCUMENTS_STORAGE_KEY, '{}');
    expect(repository.list()).toEqual([]);
    expect(repository.storageError()).toContain('unsupported format');

    storage.setItem(FORM_DOCUMENTS_STORAGE_KEY, '[{"invalid":true}]');
    expect(repository.list()).toEqual([]);
    expect(repository.storageError()).toContain('invalid');

    storage.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    expect(repository.list()).toEqual([]);
    expect(repository.storageError()).toContain('Could not read');
  });

  it('rejects invalid saves and invalid imports without writing', () => {
    const invalid = { ...documentFixture('invalid', '2026-10-19T11:00:00.000Z'), title: '' };
    expect(() => repository.save(invalid)).toThrowError(/invalid form document/);
    expect(repository.import('{broken')).toBeUndefined();
    expect(repository.storageError()).toContain('valid JSON');
    expect(storage.length).toBe(0);
  });
});
