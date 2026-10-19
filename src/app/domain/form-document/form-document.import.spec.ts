import { FORM_DOCUMENT_SCHEMA_VERSION, FormDocument } from './form-document.model';
import { importFormDocumentJson, parseFormDocument } from './form-document.import';

function validDocument(): FormDocument {
  return {
    schemaVersion: FORM_DOCUMENT_SCHEMA_VERSION,
    id: 'form_test',
    title: 'Customer intake',
    description: 'A test form',
    locale: 'en',
    submitLabel: 'Send',
    fields: [
      {
        id: 'field_kind',
        key: 'customerKind',
        type: 'select',
        label: 'Customer kind',
        description: '',
        placeholder: 'Choose one',
        defaultValue: 'person',
        width: 'half',
        options: [
          { id: 'option_person', label: 'Person', value: 'person' },
          { id: 'option_company', label: 'Company', value: 'company' },
        ],
        validation: { required: true },
      },
      {
        id: 'field_company',
        key: 'companyName',
        type: 'text',
        label: 'Company name',
        description: '',
        placeholder: '',
        width: 'half',
        options: [],
        validation: { minLength: 2, maxLength: 100 },
        condition: {
          action: 'show',
          sourceFieldId: 'field_kind',
          operator: 'equals',
          value: 'company',
        },
      },
    ],
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  };
}

describe('form document import', () => {
  it('accepts and defensively clones a valid document', () => {
    const source = validDocument();
    const result = parseFormDocument(source);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document).toEqual(source);
    expect(result.document).not.toBe(source);
    expect(result.document.fields).not.toBe(source.fields);
  });

  it('rejects unknown properties instead of silently stripping them', () => {
    const source = { ...validDocument(), executable: 'alert(1)' };
    const result = parseFormDocument(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: '$', message: expect.stringContaining('Unrecognized') }),
    );
  });

  it('rejects duplicate keys and broken condition references', () => {
    const source = validDocument();
    source.fields[1] = {
      ...source.fields[1],
      key: source.fields[0].key,
      condition: {
        action: 'show',
        sourceFieldId: 'field_missing',
        operator: 'equals',
        value: 'company',
      },
    };

    const result = parseFormDocument(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '$.fields[1].key' }),
        expect.objectContaining({ path: '$.fields[1].condition.sourceFieldId' }),
      ]),
    );
  });

  it('checks validator ranges, regular expressions, and option defaults', () => {
    const source = validDocument();
    source.fields[0] = {
      ...source.fields[0],
      defaultValue: 'missing',
    };
    source.fields[1] = {
      ...source.fields[1],
      validation: { minLength: 20, maxLength: 2, pattern: '[' },
    };

    const result = parseFormDocument(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        '$.fields[0].defaultValue',
        '$.fields[1].validation',
        '$.fields[1].validation.pattern',
      ]),
    );
  });

  it('reports malformed and oversized JSON without throwing', () => {
    expect(importFormDocumentJson('{broken')).toEqual({
      ok: false,
      issues: [{ path: '$', message: 'File is not valid JSON' }],
    });

    const result = importFormDocumentJson(`"${'x'.repeat(1_048_577)}"`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.message).toContain('import limit');
  });

  it('does not trim or coerce imported values', () => {
    const source = validDocument();
    source.id = ' form_test ';
    const result = parseFormDocument(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: '$.id', message: expect.stringContaining('whitespace') }),
    );
  });

  it('requires stable type prefixes on document, field, and option identifiers', () => {
    const source = validDocument();
    source.id = 'document_test';
    source.fields[0].id = 'control_kind';
    source.fields[0].options[0].id = 'choice_person';

    const result = parseFormDocument(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['$.id', '$.fields[0].id', '$.fields[0].options[0].id']),
    );
  });

  it('rejects multi-field condition dependency cycles', () => {
    const source = validDocument();
    source.fields[0] = {
      ...source.fields[0],
      condition: {
        action: 'show',
        sourceFieldId: source.fields[1].id,
        operator: 'equals',
        value: 'Acme',
      },
    };

    const result = parseFormDocument(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        path: '$.fields[1].condition.sourceFieldId',
        message: expect.stringContaining('dependency cycle'),
      }),
    );
  });
});
