import {
  FORM_DOCUMENT_SCHEMA_VERSION,
  FormDocument,
} from '../../domain/form-document/form-document.model';
import {
  createJsonExport,
  createTypeScriptExport,
  generateTypeScriptModel,
  serializeFormDocument,
} from './form-document-export';

function documentFixture(): FormDocument {
  return {
    schemaVersion: FORM_DOCUMENT_SCHEMA_VERSION,
    id: 'form_export',
    title: 'Анкета клиента',
    description: '',
    locale: 'ru',
    submitLabel: 'Отправить',
    fields: [
      {
        id: 'field_name',
        key: 'fullName',
        type: 'text',
        label: 'Имя',
        description: '',
        placeholder: '',
        width: 'full',
        options: [],
        validation: { required: true },
      },
      {
        id: 'field_kind',
        key: 'kind',
        type: 'radio',
        label: 'Тип',
        description: 'Choose */ safely',
        placeholder: '',
        width: 'half',
        options: [
          { id: 'option_a', label: 'A', value: 'a' },
          { id: 'option_b', label: 'B', value: 'b' },
        ],
        validation: {},
      },
      {
        id: 'field_heading',
        key: 'heading',
        type: 'heading',
        label: 'Раздел',
        description: '',
        placeholder: '',
        width: 'full',
        options: [],
        validation: {},
      },
    ],
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt: '2026-10-19T11:00:00.000Z',
  };
}

describe('form document exports', () => {
  it('serializes JSON with stable ordering and a final newline', () => {
    const document = documentFixture();
    const first = serializeFormDocument(document);
    const second = serializeFormDocument(structuredClone(document));

    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
    expect(first.indexOf('"schemaVersion"')).toBeLessThan(first.indexOf('"id"'));
    expect(JSON.parse(first)).toEqual(document);
  });

  it('creates a portable JSON export name', () => {
    const exported = createJsonExport(documentFixture());
    expect(exported.filename).toBe('anketa-klienta-formflow.json');
    expect(exported.mediaType).toBe('application/json');
  });

  it('generates deterministic types and excludes display fields', () => {
    const generated = generateTypeScriptModel(documentFixture());

    expect(generated).toContain('export interface AnketaKlientaFormValue');
    expect(generated).toContain('fullName: string;');
    expect(generated).toContain('kind?: "a" | "b";');
    expect(generated).not.toContain('heading:');
    expect(generated).toContain('Choose *\\/ safely');
    expect(generated).not.toMatch(/Generated at|2026-10-19/);
  });

  it('returns a TypeScript download descriptor', () => {
    const exported = createTypeScriptExport(documentFixture());
    expect(exported.filename).toBe('anketa-klienta-model.ts');
    expect(exported.mediaType).toBe('text/typescript');
  });
});
