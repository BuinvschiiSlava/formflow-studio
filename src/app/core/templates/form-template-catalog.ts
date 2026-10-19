import { cloneDocument } from '../../domain/form-document/form-document.factory';
import {
  FORM_DOCUMENT_SCHEMA_VERSION,
  FieldOption,
  FormDocument,
  FormFieldNode,
  FormFieldType,
} from '../../domain/form-document/form-document.model';

export const FORM_TEMPLATE_IDS = [
  'customer-onboarding',
  'it-service-request',
  'product-feedback',
  'api-access-request',
] as const;

export type FormTemplateId = (typeof FORM_TEMPLATE_IDS)[number];

export type FormTemplateCategory = 'Onboarding' | 'Support' | 'Feedback' | 'Developer';
export type FormTemplateAccent = 'indigo' | 'sky' | 'amber' | 'emerald';

export interface FormTemplateMetadata {
  readonly id: FormTemplateId;
  readonly title: string;
  readonly description: string;
  readonly category: FormTemplateCategory;
  readonly icon: string;
  readonly accent: FormTemplateAccent;
  readonly tags: readonly string[];
  readonly fieldCount: number;
}

type OptionSeed = Pick<FieldOption, 'label' | 'value'>;

type FieldOverrides = Partial<
  Pick<
    FormFieldNode,
    'description' | 'placeholder' | 'defaultValue' | 'width' | 'validation' | 'condition'
  >
> & {
  readonly options?: readonly OptionSeed[];
};

const TEMPLATE_TIMESTAMP = '2026-10-19T00:00:00.000Z';

function normalizedId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '_');
}

function templateFieldId(templateId: FormTemplateId, key: string): string {
  return `template_field_${normalizedId(templateId)}_${normalizedId(key)}`;
}

function field(
  templateId: FormTemplateId,
  key: string,
  type: FormFieldType,
  label: string,
  overrides: FieldOverrides = {},
): FormFieldNode {
  return {
    id: templateFieldId(templateId, key),
    key,
    type,
    label,
    description: overrides.description ?? '',
    placeholder: overrides.placeholder ?? '',
    defaultValue: overrides.defaultValue,
    width: overrides.width ?? 'full',
    options: (overrides.options ?? []).map((option, index) => ({
      id: `template_option_${normalizedId(templateId)}_${normalizedId(key)}_${index + 1}`,
      ...option,
    })),
    validation: { ...overrides.validation },
    condition: overrides.condition ? { ...overrides.condition } : undefined,
  };
}

function templateDocument(
  id: FormTemplateId,
  title: string,
  description: string,
  submitLabel: string,
  fields: FormFieldNode[],
): FormDocument {
  return {
    schemaVersion: FORM_DOCUMENT_SCHEMA_VERSION,
    id: `template_form_${normalizedId(id)}`,
    title,
    description,
    locale: 'en',
    submitLabel,
    fields,
    createdAt: TEMPLATE_TIMESTAMP,
    updatedAt: TEMPLATE_TIMESTAMP,
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }

  return value;
}

const customerOnboardingId = 'customer-onboarding' as const;
const customerTypeId = templateFieldId(customerOnboardingId, 'customerType');

const CUSTOMER_ONBOARDING = templateDocument(
  customerOnboardingId,
  'Customer Onboarding',
  'Collect the essential details needed to welcome a new individual or business customer.',
  'Create customer',
  [
    field(customerOnboardingId, 'profileHeading', 'heading', 'Tell us about yourself', {
      description: 'We will use these details to prepare your customer profile.',
    }),
    field(customerOnboardingId, 'customerType', 'radio', 'Customer type', {
      description: 'Choose the option that best describes this account.',
      defaultValue: 'individual',
      options: [
        { label: 'Individual', value: 'individual' },
        { label: 'Company', value: 'company' },
      ],
      validation: { required: true },
    }),
    field(customerOnboardingId, 'fullName', 'text', 'Full name', {
      placeholder: 'Alex Morgan',
      width: 'half',
      validation: { required: true, minLength: 2, maxLength: 80 },
    }),
    field(customerOnboardingId, 'email', 'email', 'Work email', {
      placeholder: 'alex@example.com',
      width: 'half',
      validation: { required: true, maxLength: 120 },
    }),
    field(customerOnboardingId, 'phone', 'text', 'Phone number', {
      description: 'Include the country code.',
      placeholder: '+1 555 010 2040',
      width: 'half',
      validation: { pattern: '^\\+?[0-9 ()-]{8,20}$' },
    }),
    field(customerOnboardingId, 'preferredStartDate', 'date', 'Preferred start date', {
      width: 'half',
    }),
    field(customerOnboardingId, 'companyName', 'text', 'Legal company name', {
      placeholder: 'Northstar Labs LLC',
      width: 'half',
      validation: { required: true, minLength: 2, maxLength: 120 },
      condition: {
        action: 'show',
        sourceFieldId: customerTypeId,
        operator: 'equals',
        value: 'company',
      },
    }),
    field(customerOnboardingId, 'taxId', 'text', 'Registration or tax ID', {
      description: 'Use the identifier shown on the company registration documents.',
      placeholder: 'AB-12345678',
      width: 'half',
      validation: { required: true, minLength: 8, maxLength: 20, pattern: '^[A-Za-z0-9-]+$' },
      condition: {
        action: 'show',
        sourceFieldId: customerTypeId,
        operator: 'equals',
        value: 'company',
      },
    }),
    field(customerOnboardingId, 'goals', 'textarea', 'What would you like to achieve?', {
      description: 'A short overview helps the team prepare for the first conversation.',
      placeholder: 'Tell us about your goals and expected outcomes.',
      validation: { required: true, minLength: 20, maxLength: 600 },
    }),
    field(customerOnboardingId, 'termsAccepted', 'checkbox', 'I agree to the service terms', {
      defaultValue: false,
      validation: { required: true },
    }),
  ],
);

const serviceRequestId = 'it-service-request' as const;
const requestCategoryId = templateFieldId(serviceRequestId, 'category');
const priorityId = templateFieldId(serviceRequestId, 'priority');
const reproducibleId = templateFieldId(serviceRequestId, 'isReproducible');

const IT_SERVICE_REQUEST = templateDocument(
  serviceRequestId,
  'IT Service Request',
  'Capture actionable incident details, urgency and reproduction steps for an IT support team.',
  'Send request',
  [
    field(serviceRequestId, 'requestHeading', 'heading', 'How can the IT team help?', {
      description: 'Provide enough detail for the team to triage the request without delay.',
    }),
    field(serviceRequestId, 'requesterName', 'text', 'Requester name', {
      placeholder: 'Sam Taylor',
      width: 'half',
      validation: { required: true, minLength: 2, maxLength: 80 },
    }),
    field(serviceRequestId, 'requesterEmail', 'email', 'Contact email', {
      placeholder: 'sam@company.com',
      width: 'half',
      validation: { required: true, maxLength: 120 },
    }),
    field(serviceRequestId, 'category', 'select', 'Request category', {
      width: 'half',
      options: [
        { label: 'Software', value: 'software' },
        { label: 'Hardware', value: 'hardware' },
        { label: 'Account or access', value: 'access' },
        { label: 'Network', value: 'network' },
        { label: 'Other', value: 'other' },
      ],
      validation: { required: true },
    }),
    field(serviceRequestId, 'priority', 'radio', 'Priority', {
      description: 'Choose Critical only when work is completely blocked.',
      defaultValue: 'normal',
      width: 'half',
      options: [
        { label: 'Low', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
        { label: 'Critical', value: 'critical' },
      ],
      validation: { required: true },
    }),
    field(serviceRequestId, 'systemName', 'text', 'Application or system name', {
      placeholder: 'Billing portal',
      validation: { required: true, minLength: 2, maxLength: 100 },
      condition: {
        action: 'show',
        sourceFieldId: requestCategoryId,
        operator: 'equals',
        value: 'software',
      },
    }),
    field(serviceRequestId, 'details', 'textarea', 'Describe the issue or request', {
      placeholder: 'What happened, what did you expect, and when did it start?',
      validation: { required: true, minLength: 20, maxLength: 1200 },
    }),
    field(serviceRequestId, 'businessImpact', 'textarea', 'Critical business impact', {
      description: 'Explain who is blocked and whether a workaround exists.',
      placeholder: 'Describe the immediate impact.',
      validation: { required: true, minLength: 20, maxLength: 500 },
      condition: {
        action: 'show',
        sourceFieldId: priorityId,
        operator: 'equals',
        value: 'critical',
      },
    }),
    field(serviceRequestId, 'isReproducible', 'toggle', 'I can reproduce the problem', {
      defaultValue: false,
    }),
    field(serviceRequestId, 'reproductionSteps', 'textarea', 'Steps to reproduce', {
      placeholder: '1. Open... 2. Select... 3. Observe...',
      validation: { required: true, minLength: 15, maxLength: 800 },
      condition: {
        action: 'show',
        sourceFieldId: reproducibleId,
        operator: 'equals',
        value: true,
      },
    }),
  ],
);

const productFeedbackId = 'product-feedback' as const;
const ratingId = templateFieldId(productFeedbackId, 'overallRating');
const contactPermissionId = templateFieldId(productFeedbackId, 'contactPermission');

const PRODUCT_FEEDBACK = templateDocument(
  productFeedbackId,
  'Product Feedback',
  'Gather focused product feedback and follow up only when the respondent gives permission.',
  'Share feedback',
  [
    field(productFeedbackId, 'feedbackHeading', 'heading', 'Help us improve the product', {
      description: 'Your feedback goes directly to the product team.',
    }),
    field(productFeedbackId, 'productArea', 'select', 'Which area are you reviewing?', {
      options: [
        { label: 'Getting started', value: 'onboarding' },
        { label: 'Form builder', value: 'builder' },
        { label: 'Preview', value: 'preview' },
        { label: 'Import and export', value: 'import-export' },
        { label: 'Other', value: 'other' },
      ],
      validation: { required: true },
    }),
    field(productFeedbackId, 'overallRating', 'number', 'Overall rating', {
      description: 'Use a score from 1 (poor) to 5 (excellent).',
      placeholder: '1–5',
      width: 'half',
      validation: { required: true, min: 1, max: 5 },
    }),
    field(productFeedbackId, 'usageFrequency', 'radio', 'How often do you use the product?', {
      width: 'half',
      options: [
        { label: 'Every day', value: 'daily' },
        { label: 'A few times a week', value: 'weekly' },
        { label: 'A few times a month', value: 'monthly' },
        { label: 'This is my first time', value: 'first-time' },
      ],
      validation: { required: true },
    }),
    field(productFeedbackId, 'improvementIdea', 'textarea', 'What should we improve first?', {
      placeholder: 'Describe the biggest obstacle you encountered.',
      validation: { required: true, minLength: 10, maxLength: 800 },
      condition: {
        action: 'show',
        sourceFieldId: ratingId,
        operator: 'lessThan',
        value: 4,
      },
    }),
    field(productFeedbackId, 'favoritePart', 'textarea', 'What worked especially well?', {
      placeholder: 'Tell us what you found most useful.',
      validation: { minLength: 10, maxLength: 500 },
      condition: {
        action: 'show',
        sourceFieldId: ratingId,
        operator: 'greaterThan',
        value: 3,
      },
    }),
    field(productFeedbackId, 'additionalComments', 'textarea', 'Anything else?', {
      placeholder: 'Add any context you would like the team to know.',
      validation: { maxLength: 1000 },
    }),
    field(productFeedbackId, 'contactPermission', 'toggle', 'The team may contact me', {
      description: 'Enable this only if you are happy to discuss your feedback.',
      defaultValue: false,
    }),
    field(productFeedbackId, 'contactEmail', 'email', 'Contact email', {
      placeholder: 'you@example.com',
      validation: { required: true, maxLength: 120 },
      condition: {
        action: 'show',
        sourceFieldId: contactPermissionId,
        operator: 'equals',
        value: true,
      },
    }),
    field(productFeedbackId, 'researchConsent', 'checkbox', 'Invite me to future research', {
      defaultValue: false,
    }),
  ],
);

const apiAccessRequestId = 'api-access-request' as const;
const environmentId = templateFieldId(apiAccessRequestId, 'environment');
const writeAccessId = templateFieldId(apiAccessRequestId, 'writeAccess');

const API_ACCESS_REQUEST = templateDocument(
  apiAccessRequestId,
  'API Access Request',
  'Collect the technical and business context required to review an API access request.',
  'Request access',
  [
    field(apiAccessRequestId, 'apiHeading', 'heading', 'Request API credentials', {
      description: 'Credentials are issued only after the owner and intended usage are verified.',
    }),
    field(apiAccessRequestId, 'applicationName', 'text', 'Application name', {
      placeholder: 'Partner order synchronizer',
      width: 'half',
      validation: { required: true, minLength: 2, maxLength: 80 },
    }),
    field(apiAccessRequestId, 'ownerEmail', 'email', 'Technical owner email', {
      placeholder: 'owner@company.com',
      width: 'half',
      validation: { required: true, maxLength: 120 },
    }),
    field(apiAccessRequestId, 'environment', 'select', 'Environment', {
      width: 'half',
      options: [
        { label: 'Development', value: 'development' },
        { label: 'Staging', value: 'staging' },
        { label: 'Production', value: 'production' },
      ],
      validation: { required: true },
    }),
    field(apiAccessRequestId, 'apiProduct', 'select', 'API product', {
      width: 'half',
      options: [
        { label: 'Customers API', value: 'customers' },
        { label: 'Orders API', value: 'orders' },
        { label: 'Reporting API', value: 'reporting' },
        { label: 'Events API', value: 'events' },
      ],
      validation: { required: true },
    }),
    field(
      apiAccessRequestId,
      'expectedRequestsPerMinute',
      'number',
      'Expected requests per minute',
      {
        description: 'Provide a realistic peak estimate.',
        defaultValue: 100,
        width: 'half',
        validation: { required: true, min: 1, max: 100000 },
      },
    ),
    field(apiAccessRequestId, 'callbackUrl', 'text', 'HTTPS callback URL', {
      placeholder: 'https://app.example.com/api/events',
      width: 'half',
      validation: {
        maxLength: 300,
        pattern: '^https:\\/\\/[A-Za-z0-9.-]+(?::[0-9]+)?(?:\\/[^\\s]*)?$',
      },
    }),
    field(apiAccessRequestId, 'useCase', 'textarea', 'Business use case', {
      description: 'Describe the data flow and the value it provides to users.',
      placeholder: 'Explain how your application will use this API.',
      validation: { required: true, minLength: 30, maxLength: 1200 },
    }),
    field(apiAccessRequestId, 'productionJustification', 'textarea', 'Production justification', {
      description: 'Include launch timing, expected users and operational ownership.',
      placeholder: 'Explain why production access is required now.',
      validation: { required: true, minLength: 30, maxLength: 800 },
      condition: {
        action: 'show',
        sourceFieldId: environmentId,
        operator: 'equals',
        value: 'production',
      },
    }),
    field(apiAccessRequestId, 'writeAccess', 'toggle', 'The application needs write access', {
      defaultValue: false,
    }),
    field(apiAccessRequestId, 'writeScope', 'textarea', 'Required write operations', {
      placeholder: 'List the resources the application must create or update.',
      validation: { required: true, minLength: 20, maxLength: 600 },
      condition: {
        action: 'show',
        sourceFieldId: writeAccessId,
        operator: 'equals',
        value: true,
      },
    }),
    field(
      apiAccessRequestId,
      'securityAcknowledgement',
      'checkbox',
      'I will store credentials securely',
      {
        description: 'Credentials must never be committed to source control or shared in messages.',
        defaultValue: false,
        validation: { required: true },
      },
    ),
  ],
);

const TEMPLATE_DOCUMENTS: Record<FormTemplateId, FormDocument> = deepFreeze({
  'customer-onboarding': CUSTOMER_ONBOARDING,
  'it-service-request': IT_SERVICE_REQUEST,
  'product-feedback': PRODUCT_FEEDBACK,
  'api-access-request': API_ACCESS_REQUEST,
});

export const FORM_TEMPLATE_CATALOG: readonly FormTemplateMetadata[] = deepFreeze([
  {
    id: 'customer-onboarding',
    title: CUSTOMER_ONBOARDING.title,
    description: CUSTOMER_ONBOARDING.description,
    category: 'Onboarding',
    icon: 'user-round-plus',
    accent: 'indigo',
    tags: ['Conditional fields', 'Customer profile', 'Validation'],
    fieldCount: CUSTOMER_ONBOARDING.fields.length,
  },
  {
    id: 'it-service-request',
    title: IT_SERVICE_REQUEST.title,
    description: IT_SERVICE_REQUEST.description,
    category: 'Support',
    icon: 'life-buoy',
    accent: 'sky',
    tags: ['Incident triage', 'Priority', 'Reproduction steps'],
    fieldCount: IT_SERVICE_REQUEST.fields.length,
  },
  {
    id: 'product-feedback',
    title: PRODUCT_FEEDBACK.title,
    description: PRODUCT_FEEDBACK.description,
    category: 'Feedback',
    icon: 'message-square-heart',
    accent: 'amber',
    tags: ['Rating', 'Research consent', 'Follow-up'],
    fieldCount: PRODUCT_FEEDBACK.fields.length,
  },
  {
    id: 'api-access-request',
    title: API_ACCESS_REQUEST.title,
    description: API_ACCESS_REQUEST.description,
    category: 'Developer',
    icon: 'braces',
    accent: 'emerald',
    tags: ['API governance', 'Production review', 'Security'],
    fieldCount: API_ACCESS_REQUEST.fields.length,
  },
]);

export function getFormTemplateMetadata(id: FormTemplateId): FormTemplateMetadata {
  const metadata = FORM_TEMPLATE_CATALOG.find((template) => template.id === id);
  if (!metadata) throw new Error(`Unknown form template: ${id}`);
  return metadata;
}

export function createDocumentFromTemplate(id: FormTemplateId, title?: string): FormDocument {
  const source = (TEMPLATE_DOCUMENTS as Partial<Record<string, FormDocument>>)[id];
  if (!source) throw new Error(`Unknown form template: ${id}`);
  return cloneDocument(source, title ?? source.title);
}
