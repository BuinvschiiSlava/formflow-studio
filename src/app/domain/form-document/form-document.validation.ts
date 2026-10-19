import { FormDocument, FormFieldNode, ImportIssue, isDisplayField } from './form-document.model';

const VALID_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const VALUELESS_OPERATORS = new Set(['isEmpty', 'isNotEmpty']);
const NUMERIC_OPERATORS = new Set(['greaterThan', 'lessThan']);

function issue(path: string, message: string): ImportIssue {
  return { path, message };
}

function validateDefaultValue(field: FormFieldNode, path: string, issues: ImportIssue[]): void {
  if (field.defaultValue === undefined) return;

  if (field.type === 'number' && typeof field.defaultValue !== 'number') {
    issues.push(issue(`${path}.defaultValue`, 'Number fields require a numeric default value'));
  }

  if (
    (field.type === 'checkbox' || field.type === 'toggle') &&
    typeof field.defaultValue !== 'boolean'
  ) {
    issues.push(issue(`${path}.defaultValue`, 'Boolean fields require a boolean default value'));
  }

  if (
    ['text', 'email', 'textarea', 'date', 'select', 'radio'].includes(field.type) &&
    typeof field.defaultValue !== 'string'
  ) {
    issues.push(issue(`${path}.defaultValue`, 'This field type requires a string default value'));
  }

  if (
    (field.type === 'select' || field.type === 'radio') &&
    !field.options.some((option) => option.value === field.defaultValue)
  ) {
    issues.push(
      issue(`${path}.defaultValue`, 'The default value must match one of the field options'),
    );
  }
}

function validateFieldOptions(field: FormFieldNode, path: string, issues: ImportIssue[]): void {
  const supportsOptions = field.type === 'select' || field.type === 'radio';
  if (supportsOptions && field.options.length === 0) {
    issues.push(issue(`${path}.options`, 'Select and radio fields need at least one option'));
  } else if (!supportsOptions && field.options.length > 0) {
    issues.push(issue(`${path}.options`, 'Only select and radio fields may define options'));
  }

  const optionIds = new Set<string>();
  const optionValues = new Set<string>();
  field.options.forEach((option, optionIndex) => {
    const optionPath = `${path}.options[${optionIndex}]`;
    if (optionIds.has(option.id)) {
      issues.push(issue(`${optionPath}.id`, `Duplicate option id "${option.id}"`));
    }
    if (optionValues.has(option.value)) {
      issues.push(issue(`${optionPath}.value`, `Duplicate option value "${option.value}"`));
    }
    optionIds.add(option.id);
    optionValues.add(option.value);
  });
}

function validateFieldValidation(field: FormFieldNode, path: string, issues: ImportIssue[]): void {
  const validationPath = `${path}.validation`;
  const validation = field.validation;

  if (
    validation.minLength !== undefined &&
    validation.maxLength !== undefined &&
    validation.minLength > validation.maxLength
  ) {
    issues.push(issue(validationPath, 'minLength cannot be greater than maxLength'));
  }
  if (
    validation.min !== undefined &&
    validation.max !== undefined &&
    validation.min > validation.max
  ) {
    issues.push(issue(validationPath, 'min cannot be greater than max'));
  }
  if (validation.pattern !== undefined) {
    try {
      new RegExp(validation.pattern);
    } catch {
      issues.push(issue(`${validationPath}.pattern`, 'Pattern must be a valid regular expression'));
    }
  }

  if (isDisplayField(field) && Object.keys(validation).length > 0) {
    issues.push(issue(validationPath, 'Display fields cannot have validation rules'));
  }
  if (
    (validation.minLength !== undefined ||
      validation.maxLength !== undefined ||
      validation.pattern !== undefined) &&
    !['text', 'email', 'textarea'].includes(field.type)
  ) {
    issues.push(
      issue(validationPath, 'Length and pattern rules are only supported by text fields'),
    );
  }
  if ((validation.min !== undefined || validation.max !== undefined) && field.type !== 'number') {
    issues.push(issue(validationPath, 'Numeric min and max rules require a number field'));
  }
}

function validateConditionGraph(document: FormDocument, issues: ImportIssue[]): void {
  const fieldsById = new Map(document.fields.map((field) => [field.id, field]));
  const fieldIndexById = new Map(document.fields.map((field, index) => [field.id, index]));
  const state = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (fieldId: string): void => {
    if (state.get(fieldId) === 'visited') return;
    state.set(fieldId, 'visiting');
    stack.push(fieldId);

    const sourceId = fieldsById.get(fieldId)?.condition?.sourceFieldId;
    if (sourceId && sourceId !== fieldId && fieldsById.has(sourceId)) {
      if (state.get(sourceId) === 'visiting') {
        const cycleStart = stack.indexOf(sourceId);
        const cycle = [...stack.slice(cycleStart), sourceId];
        const signature = [...new Set(cycle)].sort().join('|');
        if (!reported.has(signature)) {
          const index = fieldIndexById.get(fieldId);
          const names = cycle.map((id) => fieldsById.get(id)?.key ?? id).join(' → ');
          issues.push(
            issue(
              `$.fields[${index ?? 0}].condition.sourceFieldId`,
              `Condition dependency cycle detected: ${names}`,
            ),
          );
          reported.add(signature);
        }
      } else if (state.get(sourceId) !== 'visited') {
        visit(sourceId);
      }
    }

    stack.pop();
    state.set(fieldId, 'visited');
  };

  for (const field of document.fields) visit(field.id);
}

/** Performs rules that are not expressible as a local Zod shape. */
export function validateFormDocumentSemantics(document: FormDocument): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const fieldIds = new Set<string>();
  const fieldKeys = new Set<string>();
  const fieldsById = new Map(document.fields.map((field) => [field.id, field]));

  if (Date.parse(document.createdAt) > Date.parse(document.updatedAt)) {
    issues.push(issue('$.updatedAt', 'updatedAt cannot be earlier than createdAt'));
  }

  document.fields.forEach((field, index) => {
    const path = `$.fields[${index}]`;

    if (fieldIds.has(field.id)) {
      issues.push(issue(`${path}.id`, `Duplicate field id "${field.id}"`));
    }
    if (fieldKeys.has(field.key)) {
      issues.push(issue(`${path}.key`, `Duplicate field key "${field.key}"`));
    }
    fieldIds.add(field.id);
    fieldKeys.add(field.key);

    if (!VALID_KEY_PATTERN.test(field.key)) {
      issues.push(
        issue(
          `${path}.key`,
          'Keys must start with a letter and contain only letters, digits, or underscores',
        ),
      );
    }
    if (RESERVED_KEYS.has(field.key)) {
      issues.push(issue(`${path}.key`, `The key "${field.key}" is reserved`));
    }

    if (isDisplayField(field) && field.defaultValue !== undefined) {
      issues.push(issue(`${path}.defaultValue`, 'Display fields cannot have a default value'));
    }

    validateDefaultValue(field, path, issues);
    validateFieldOptions(field, path, issues);
    validateFieldValidation(field, path, issues);
  });

  document.fields.forEach((field, index) => {
    if (!field.condition) return;
    const path = `$.fields[${index}].condition`;
    const source = fieldsById.get(field.condition.sourceFieldId);

    if (!source) {
      issues.push(issue(`${path}.sourceFieldId`, 'Condition source field does not exist'));
      return;
    }
    if (source.id === field.id) {
      issues.push(issue(`${path}.sourceFieldId`, 'A field cannot depend on itself'));
    }
    if (isDisplayField(source)) {
      issues.push(issue(`${path}.sourceFieldId`, 'Condition source must be an input field'));
    }

    if (VALUELESS_OPERATORS.has(field.condition.operator)) {
      if (field.condition.value !== undefined) {
        issues.push(issue(`${path}.value`, 'This operator does not accept a comparison value'));
      }
    } else if (field.condition.value === undefined) {
      issues.push(issue(`${path}.value`, 'This operator requires a comparison value'));
    }

    if (NUMERIC_OPERATORS.has(field.condition.operator)) {
      if (source.type !== 'number') {
        issues.push(issue(`${path}.operator`, 'Numeric comparison requires a number source field'));
      }
      if (typeof field.condition.value !== 'number') {
        issues.push(issue(`${path}.value`, 'Numeric comparison requires a numeric value'));
      }
    }

    if (
      field.condition.operator === 'contains' &&
      !['text', 'email', 'textarea', 'select', 'radio'].includes(source.type)
    ) {
      issues.push(issue(`${path}.operator`, 'Contains requires a text-like source field'));
    }
    if (field.condition.operator === 'contains' && typeof field.condition.value !== 'string') {
      issues.push(issue(`${path}.value`, 'Contains requires a string comparison value'));
    }

    if (
      (field.condition.operator === 'equals' || field.condition.operator === 'notEquals') &&
      field.condition.value !== undefined
    ) {
      const expectedType =
        source.type === 'number'
          ? 'number'
          : source.type === 'checkbox' || source.type === 'toggle'
            ? 'boolean'
            : 'string';
      if (typeof field.condition.value !== expectedType) {
        issues.push(
          issue(
            `${path}.value`,
            `Comparison value must be a ${expectedType} for the selected source field`,
          ),
        );
      }
    }
  });

  validateConditionGraph(document, issues);

  return issues;
}
