import { FormlyFieldConfig } from '@ngx-formly/core';

import { FieldCondition, FormDocument, FormFieldNode } from './form-document.model';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function readModelValue(model: unknown, key: string): unknown {
  if (typeof model !== 'object' || model === null) return undefined;
  if (!Object.prototype.hasOwnProperty.call(model, key)) return undefined;
  return (model as Record<string, unknown>)[key];
}

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function evaluateFieldCondition(
  condition: FieldCondition,
  sourceKey: string,
  model: unknown,
): boolean {
  const actual = readModelValue(model, sourceKey);

  switch (condition.operator) {
    case 'equals':
      return actual === condition.value;
    case 'notEquals':
      return actual !== condition.value;
    case 'contains':
      return (
        typeof actual === 'string' &&
        typeof condition.value === 'string' &&
        actual.includes(condition.value)
      );
    case 'isEmpty':
      return isEmpty(actual);
    case 'isNotEmpty':
      return !isEmpty(actual);
    case 'greaterThan':
      return (
        typeof actual === 'number' &&
        typeof condition.value === 'number' &&
        actual > condition.value
      );
    case 'lessThan':
      return (
        typeof actual === 'number' &&
        typeof condition.value === 'number' &&
        actual < condition.value
      );
  }
}

function mapDisplayField(field: FormFieldNode): FormlyFieldConfig {
  const label = escapeHtml(field.label);
  const description = field.description
    ? `<p class="formflow-display-description">${escapeHtml(field.description)}</p>`
    : '';

  if (field.type === 'divider') {
    return {
      id: field.id,
      template: '<hr class="formflow-divider" aria-hidden="true">',
      className: `formflow-width--${field.width}`,
    };
  }

  const level = field.type === 'heading' ? 'h2' : 'h3';
  return {
    id: field.id,
    template: `<${level} class="formflow-display-title">${label}</${level}>${description}`,
    className: `formflow-width--${field.width}`,
  };
}

function formlyType(field: FormFieldNode): string {
  switch (field.type) {
    case 'textarea':
      return 'textarea';
    case 'select':
      return 'select';
    case 'radio':
      return 'radio';
    case 'checkbox':
      return 'checkbox';
    case 'toggle':
      return 'toggle';
    default:
      return 'input';
  }
}

function inputType(field: FormFieldNode): string | undefined {
  if (field.type === 'email' || field.type === 'number' || field.type === 'date') {
    return field.type;
  }
  return field.type === 'text' ? 'text' : undefined;
}

function mapInputField(field: FormFieldNode, locale: FormDocument['locale']): FormlyFieldConfig {
  return {
    id: field.id,
    key: field.key,
    type: formlyType(field),
    className: `formflow-width--${field.width}`,
    ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
    props: {
      formflowLocale: locale,
      label: field.label,
      ...(field.description ? { description: field.description } : {}),
      ...(field.placeholder ? { placeholder: field.placeholder } : {}),
      ...(inputType(field) ? { type: inputType(field) } : {}),
      ...(field.options.length > 0
        ? {
            options: field.options.map((option) => ({
              label: option.label,
              value: option.value,
            })),
          }
        : {}),
      ...(field.validation.required !== undefined ? { required: field.validation.required } : {}),
      ...(field.validation.minLength !== undefined
        ? { minLength: field.validation.minLength }
        : {}),
      ...(field.validation.maxLength !== undefined
        ? { maxLength: field.validation.maxLength }
        : {}),
      ...(field.validation.min !== undefined ? { min: field.validation.min } : {}),
      ...(field.validation.max !== undefined ? { max: field.validation.max } : {}),
      ...(field.validation.pattern !== undefined ? { pattern: field.validation.pattern } : {}),
    },
    resetOnHide: false,
  };
}

function attachCondition(
  config: FormlyFieldConfig,
  field: FormFieldNode,
  fieldsById: ReadonlyMap<string, FormFieldNode>,
): FormlyFieldConfig {
  const condition = field.condition;
  if (!condition) return config;
  const source = fieldsById.get(condition.sourceFieldId);
  if (!source) return config;

  const predicate = (formlyField: FormlyFieldConfig) =>
    evaluateFieldCondition(condition, source.key, formlyField.model);
  return {
    ...config,
    expressions:
      condition.action === 'show'
        ? { ...(config.expressions ?? {}), hide: (formlyField) => !predicate(formlyField) }
        : {
            ...(config.expressions ?? {}),
            'props.disabled': (formlyField) => !predicate(formlyField),
          },
  };
}

/** Converts the serializable domain schema to fresh, runtime-only Formly config. */
export function mapDocumentToFormlyFields(document: FormDocument): FormlyFieldConfig[] {
  const fieldsById = new Map(document.fields.map((field) => [field.id, field]));
  return document.fields.map((field) => {
    const config = ['heading', 'divider', 'section'].includes(field.type)
      ? mapDisplayField(field)
      : mapInputField(field, document.locale);
    return attachCondition(config, field, fieldsById);
  });
}
