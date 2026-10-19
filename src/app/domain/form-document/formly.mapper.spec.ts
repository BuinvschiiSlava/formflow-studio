import { FormlyFieldConfig } from '@ngx-formly/core';

import { FORM_DOCUMENT_SCHEMA_VERSION, FormDocument } from './form-document.model';
import { evaluateFieldCondition, mapDocumentToFormlyFields } from './formly.mapper';

function documentFixture(): FormDocument {
  return {
    schemaVersion: FORM_DOCUMENT_SCHEMA_VERSION,
    id: 'form_mapper',
    title: 'Mapper',
    description: '',
    locale: 'en',
    submitLabel: 'Submit',
    fields: [
      {
        id: 'field_source',
        key: 'accountType',
        type: 'select',
        label: 'Account type',
        description: 'Pick one',
        placeholder: '',
        width: 'half',
        options: [
          { id: 'option_one', label: 'Personal', value: 'personal' },
          { id: 'option_two', label: 'Business', value: 'business' },
        ],
        validation: { required: true },
      },
      {
        id: 'field_target',
        key: 'company',
        type: 'text',
        label: 'Company',
        description: '',
        placeholder: 'Acme',
        width: 'half',
        options: [],
        validation: { minLength: 2 },
        condition: {
          action: 'show',
          sourceFieldId: 'field_source',
          operator: 'equals',
          value: 'business',
        },
      },
      {
        id: 'field_heading',
        key: 'unsafeHeading',
        type: 'heading',
        label: '<script>alert(1)</script>',
        description: '',
        placeholder: '',
        width: 'full',
        options: [],
        validation: {},
      },
    ],
    createdAt: '2026-10-19T10:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  };
}

describe('Formly mapper', () => {
  it('maps fields, options, validation and layout without sharing mutable objects', () => {
    const document = documentFixture();
    const first = mapDocumentToFormlyFields(document);
    const second = mapDocumentToFormlyFields(document);

    expect(first[0]).toEqual(
      expect.objectContaining({
        id: 'field_source',
        key: 'accountType',
        type: 'select',
        className: 'formflow-width--half',
        resetOnHide: false,
      }),
    );
    expect(first[0].props?.required).toBe(true);
    expect(first[0].props?.['formflowLocale']).toBe('en');
    expect(first[0].props?.options).toEqual([
      { label: 'Personal', value: 'personal' },
      { label: 'Business', value: 'business' },
    ]);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it('compiles show conditions to safe functions', () => {
    const [, target] = mapDocumentToFormlyFields(documentFixture());
    const hide = target.expressions?.['hide'] as (field: FormlyFieldConfig) => boolean;

    expect(hide({ model: { accountType: 'personal' } })).toBe(true);
    expect(hide({ model: { accountType: 'business' } })).toBe(false);
  });

  it('escapes imported display content', () => {
    const heading = mapDocumentToFormlyFields(documentFixture())[2];
    expect(heading.template).toContain('&lt;script&gt;');
    expect(heading.template).not.toContain('<script>');
  });

  it('evaluates typed numeric and empty conditions without coercion', () => {
    expect(
      evaluateFieldCondition(
        {
          action: 'enable',
          sourceFieldId: 'age',
          operator: 'greaterThan',
          value: 17,
        },
        'age',
        { age: 18 },
      ),
    ).toBe(true);
    expect(
      evaluateFieldCondition(
        {
          action: 'show',
          sourceFieldId: 'name',
          operator: 'isEmpty',
        },
        'name',
        { name: '' },
      ),
    ).toBe(true);
    expect(
      evaluateFieldCondition(
        {
          action: 'enable',
          sourceFieldId: 'age',
          operator: 'greaterThan',
          value: 17,
        },
        'age',
        { age: '18' },
      ),
    ).toBe(false);
  });
});
