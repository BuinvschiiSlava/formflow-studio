import { z } from 'zod';

import { FORM_DOCUMENT_SCHEMA_VERSION } from './form-document.model';

export const FORM_DOCUMENT_LIMITS = {
  maxImportBytes: 1_048_576,
  maxFields: 200,
  maxOptionsPerField: 100,
  maxTitleLength: 120,
  maxDescriptionLength: 2_000,
  maxLabelLength: 200,
  maxKeyLength: 80,
  maxPatternLength: 256,
} as const;

const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .refine((value) => value.trim() === value, 'Must not have surrounding whitespace');
const prefixedIdentifierSchema = (prefix: 'form' | 'field' | 'option') =>
  identifierSchema.refine(
    (value) => value.startsWith(`${prefix}_`) && value.length > prefix.length + 1,
    `Must start with ${prefix}_ and include a suffix`,
  );
const nonEmptyTextSchema = (maxLength: number) =>
  z
    .string()
    .min(1)
    .max(maxLength)
    .refine((value) => value.trim().length > 0, 'Must contain visible text');
const optionalTextSchema = (maxLength: number) => z.string().max(maxLength);
const scalarSchema = z.union([z.string().max(2_000), z.number().finite(), z.boolean()]);
const utcIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, 'Expected an ISO 8601 UTC timestamp')
  .refine((value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) return false;
    const normalized = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
    return parsed.toISOString() === normalized;
  }, 'Expected a real calendar date and time');

export const fieldOptionSchema = z
  .object({
    id: prefixedIdentifierSchema('option'),
    label: nonEmptyTextSchema(FORM_DOCUMENT_LIMITS.maxLabelLength),
    value: z.string().max(500),
  })
  .strict();

export const fieldValidationSchema = z
  .object({
    required: z.boolean().optional(),
    minLength: z.number().int().min(0).max(100_000).optional(),
    maxLength: z.number().int().min(0).max(100_000).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    pattern: z.string().max(FORM_DOCUMENT_LIMITS.maxPatternLength).optional(),
  })
  .strict();

export const fieldConditionSchema = z
  .object({
    action: z.enum(['show', 'enable']),
    sourceFieldId: prefixedIdentifierSchema('field'),
    operator: z.enum([
      'equals',
      'notEquals',
      'contains',
      'isEmpty',
      'isNotEmpty',
      'greaterThan',
      'lessThan',
    ]),
    value: scalarSchema.optional(),
  })
  .strict();

export const formFieldNodeSchema = z
  .object({
    id: prefixedIdentifierSchema('field'),
    key: z
      .string()
      .min(1)
      .max(FORM_DOCUMENT_LIMITS.maxKeyLength)
      .refine((value) => value.trim() === value, 'Must not have surrounding whitespace'),
    type: z.enum([
      'text',
      'email',
      'number',
      'textarea',
      'date',
      'select',
      'radio',
      'checkbox',
      'toggle',
      'heading',
      'divider',
      'section',
    ]),
    label: nonEmptyTextSchema(FORM_DOCUMENT_LIMITS.maxLabelLength),
    description: optionalTextSchema(FORM_DOCUMENT_LIMITS.maxDescriptionLength),
    placeholder: optionalTextSchema(FORM_DOCUMENT_LIMITS.maxLabelLength),
    defaultValue: scalarSchema.optional(),
    width: z.enum(['full', 'half', 'third']),
    options: z.array(fieldOptionSchema).max(FORM_DOCUMENT_LIMITS.maxOptionsPerField),
    validation: fieldValidationSchema,
    condition: fieldConditionSchema.optional(),
  })
  .strict();

export const formDocumentSchema = z
  .object({
    schemaVersion: z.literal(FORM_DOCUMENT_SCHEMA_VERSION),
    id: prefixedIdentifierSchema('form'),
    title: nonEmptyTextSchema(FORM_DOCUMENT_LIMITS.maxTitleLength),
    description: optionalTextSchema(FORM_DOCUMENT_LIMITS.maxDescriptionLength),
    locale: z.enum(['en', 'ru']),
    submitLabel: nonEmptyTextSchema(FORM_DOCUMENT_LIMITS.maxLabelLength),
    fields: z.array(formFieldNodeSchema).max(FORM_DOCUMENT_LIMITS.maxFields),
    createdAt: utcIsoDateSchema,
    updatedAt: utcIsoDateSchema,
  })
  .strict();
