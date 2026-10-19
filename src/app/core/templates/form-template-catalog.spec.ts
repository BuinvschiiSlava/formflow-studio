import {
  FORM_TEMPLATE_CATALOG,
  FORM_TEMPLATE_IDS,
  FormTemplateId,
  createDocumentFromTemplate,
  getFormTemplateMetadata,
} from './form-template-catalog';

describe('form template catalog', () => {
  it('publishes four unique, immutable catalog entries', () => {
    expect(FORM_TEMPLATE_CATALOG).toHaveLength(4);
    expect(new Set(FORM_TEMPLATE_CATALOG.map((template) => template.id)).size).toBe(4);
    expect(FORM_TEMPLATE_CATALOG.map((template) => template.id)).toEqual(FORM_TEMPLATE_IDS);
    expect(Object.isFrozen(FORM_TEMPLATE_CATALOG)).toBe(true);

    for (const template of FORM_TEMPLATE_CATALOG) {
      expect(Object.isFrozen(template)).toBe(true);
      expect(Object.isFrozen(template.tags)).toBe(true);
      expect(template.fieldCount).toBeGreaterThanOrEqual(9);
    }
  });

  it.each(FORM_TEMPLATE_IDS)('creates a valid %s document', (templateId) => {
    const document = createDocumentFromTemplate(templateId);
    const fieldIds = new Set(document.fields.map((field) => field.id));
    const fieldKeys = new Set(document.fields.map((field) => field.key));
    const optionIds = document.fields.flatMap((field) => field.options.map((option) => option.id));

    expect(document.id).toMatch(/^form_/);
    expect(document.title).toBe(getFormTemplateMetadata(templateId).title);
    expect(document.fields).toHaveLength(getFormTemplateMetadata(templateId).fieldCount);
    expect(fieldIds.size).toBe(document.fields.length);
    expect(fieldKeys.size).toBe(document.fields.length);
    expect(new Set(optionIds).size).toBe(optionIds.length);

    for (const currentField of document.fields) {
      if (currentField.condition) {
        expect(fieldIds.has(currentField.condition.sourceFieldId)).toBe(true);
        expect(currentField.condition.sourceFieldId).not.toBe(currentField.id);
      }

      const { minLength, maxLength, min, max, pattern } = currentField.validation;
      if (minLength !== undefined && maxLength !== undefined) {
        expect(minLength).toBeLessThanOrEqual(maxLength);
      }
      if (min !== undefined && max !== undefined) expect(min).toBeLessThanOrEqual(max);
      if (pattern) expect(() => new RegExp(pattern)).not.toThrow();
      if (currentField.type === 'select' || currentField.type === 'radio') {
        expect(currentField.options.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it.each(FORM_TEMPLATE_IDS)('returns independent copies for %s', (templateId) => {
    const first = createDocumentFromTemplate(templateId);
    const second = createDocumentFromTemplate(templateId);
    const firstIds = new Set(first.fields.map((field) => field.id));

    expect(first).not.toBe(second);
    expect(first.id).not.toBe(second.id);
    expect(second.fields.every((field) => !firstIds.has(field.id))).toBe(true);

    first.title = 'Changed by the user';
    first.fields[0].label = 'Changed field';
    first.fields[0].validation.required = true;

    const fresh = createDocumentFromTemplate(templateId);
    expect(fresh.title).toBe(getFormTemplateMetadata(templateId).title);
    expect(fresh.fields[0].label).not.toBe('Changed field');
  });

  it('remaps every condition to the matching field in each fresh document', () => {
    const first = createDocumentFromTemplate('api-access-request');
    const second = createDocumentFromTemplate('api-access-request');
    const firstEnvironment = first.fields.find((field) => field.key === 'environment');
    const secondEnvironment = second.fields.find((field) => field.key === 'environment');
    const firstJustification = first.fields.find(
      (field) => field.key === 'productionJustification',
    );
    const secondJustification = second.fields.find(
      (field) => field.key === 'productionJustification',
    );

    expect(firstJustification?.condition?.sourceFieldId).toBe(firstEnvironment?.id);
    expect(secondJustification?.condition?.sourceFieldId).toBe(secondEnvironment?.id);
    expect(firstJustification?.condition?.sourceFieldId).not.toBe(
      secondJustification?.condition?.sourceFieldId,
    );
  });

  it('supports a custom title without mutating the template metadata', () => {
    const document = createDocumentFromTemplate('customer-onboarding', 'Acme onboarding');

    expect(document.title).toBe('Acme onboarding');
    expect(getFormTemplateMetadata('customer-onboarding').title).toBe('Customer Onboarding');
  });

  it('rejects unknown template identifiers at runtime', () => {
    const unknownId = 'not-a-template' as FormTemplateId;

    expect(() => createDocumentFromTemplate(unknownId)).toThrowError(
      'Unknown form template: not-a-template',
    );
    expect(() => getFormTemplateMetadata(unknownId)).toThrowError(
      'Unknown form template: not-a-template',
    );
  });
});
