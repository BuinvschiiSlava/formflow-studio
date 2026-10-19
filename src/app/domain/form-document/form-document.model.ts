export const FORM_DOCUMENT_SCHEMA_VERSION = 1 as const;

export type FormLocale = 'en' | 'ru';
export type FieldWidth = 'full' | 'half' | 'third';

export type InputFieldType =
  'text' | 'email' | 'number' | 'textarea' | 'date' | 'select' | 'radio' | 'checkbox' | 'toggle';

export type DisplayFieldType = 'heading' | 'divider' | 'section';
export type FormFieldType = InputFieldType | DisplayFieldType;

export type ConditionOperator =
  'equals' | 'notEquals' | 'contains' | 'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan';

export type ConditionAction = 'show' | 'enable';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FieldCondition {
  action: ConditionAction;
  sourceFieldId: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface FormFieldNode {
  id: string;
  key: string;
  type: FormFieldType;
  label: string;
  description: string;
  placeholder: string;
  defaultValue?: string | number | boolean;
  width: FieldWidth;
  options: FieldOption[];
  validation: FieldValidation;
  condition?: FieldCondition;
}

export interface FormDocument {
  schemaVersion: typeof FORM_DOCUMENT_SCHEMA_VERSION;
  id: string;
  title: string;
  description: string;
  locale: FormLocale;
  submitLabel: string;
  fields: FormFieldNode[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportIssue {
  path: string;
  message: string;
}

export type ImportResult =
  { ok: true; document: FormDocument } | { ok: false; issues: ImportIssue[] };

export const DISPLAY_FIELD_TYPES = new Set<FormFieldType>(['heading', 'divider', 'section']);

export function isDisplayField(field: FormFieldNode): boolean {
  return DISPLAY_FIELD_TYPES.has(field.type);
}
