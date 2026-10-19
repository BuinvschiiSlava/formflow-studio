import {
  FORM_DOCUMENT_SCHEMA_VERSION,
  FormDocument,
  FormFieldNode,
  FormFieldType,
} from './form-document.model';

const DEFAULT_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  email: 'Email address',
  number: 'Number',
  textarea: 'Long text',
  date: 'Date',
  select: 'Dropdown',
  radio: 'Radio group',
  checkbox: 'Checkbox',
  toggle: 'Toggle',
  heading: 'Heading',
  divider: 'Divider',
  section: 'Section',
};

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function slugifyKey(value: string): string {
  const transliterated = value
    .replace(
      /[а-яё]/gi,
      (letter) =>
        ({
          а: 'a',
          б: 'b',
          в: 'v',
          г: 'g',
          д: 'd',
          е: 'e',
          ё: 'e',
          ж: 'zh',
          з: 'z',
          и: 'i',
          й: 'y',
          к: 'k',
          л: 'l',
          м: 'm',
          н: 'n',
          о: 'o',
          п: 'p',
          р: 'r',
          с: 's',
          т: 't',
          у: 'u',
          ф: 'f',
          х: 'h',
          ц: 'c',
          ч: 'ch',
          ш: 'sh',
          щ: 'sch',
          ъ: '',
          ы: 'y',
          ь: '',
          э: 'e',
          ю: 'yu',
          я: 'ya',
        })[letter.toLowerCase()] ?? '',
    )
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const normalized = word.toLowerCase();
      return index === 0
        ? normalized
        : `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
    })
    .join('');

  return transliterated || 'field';
}

export function uniqueFieldKey(
  requested: string,
  fields: readonly FormFieldNode[],
  currentFieldId?: string,
): string {
  const base = slugifyKey(requested);
  const used = new Set(
    fields.filter((field) => field.id !== currentFieldId).map((field) => field.key),
  );
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

export function createField(
  type: FormFieldType,
  existingFields: readonly FormFieldNode[] = [],
): FormFieldNode {
  const label = DEFAULT_LABELS[type];
  const withOptions = type === 'select' || type === 'radio';

  return {
    id: createId('field'),
    key: uniqueFieldKey(label, existingFields),
    type,
    label,
    description: '',
    placeholder: type === 'textarea' ? 'Enter details' : '',
    width: 'full',
    options: withOptions
      ? [
          { id: createId('option'), label: 'Option 1', value: 'option-1' },
          { id: createId('option'), label: 'Option 2', value: 'option-2' },
        ]
      : [],
    validation: {},
  };
}

export function createBlankDocument(title = 'Untitled form'): FormDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: FORM_DOCUMENT_SCHEMA_VERSION,
    id: createId('form'),
    title,
    description: '',
    locale: 'en',
    submitLabel: 'Submit',
    fields: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function cloneDocument(source: FormDocument, title?: string): FormDocument {
  const idMap = new Map<string, string>();
  const fields = source.fields.map((field) => {
    const id = createId('field');
    idMap.set(field.id, id);
    return {
      ...structuredClone(field),
      id,
      options: field.options.map((option) => ({ ...option, id: createId('option') })),
    };
  });

  const now = new Date().toISOString();
  return {
    ...structuredClone(source),
    id: createId('form'),
    title: title ?? `${source.title} copy`,
    fields: fields.map((field) => ({
      ...field,
      condition: field.condition
        ? {
            ...field.condition,
            sourceFieldId:
              idMap.get(field.condition.sourceFieldId) ?? field.condition.sourceFieldId,
          }
        : undefined,
    })),
    createdAt: now,
    updatedAt: now,
  };
}
