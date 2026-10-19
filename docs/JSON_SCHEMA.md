# JSON document contract

This document describes the public import/export format of FormFlow Studio. It is a data
contract, not a Formly configuration format.

## Version policy

`schemaVersion` is required and currently equals `1`.

- Adding an optional property with a safe default may remain in the same version.
- Removing, renaming, or changing the meaning or type of a property requires a new version.
- No older versions are supported in `1.0.0`; a future importer may migrate only versions
  that are explicitly documented and tested.
- A document from an unknown future version is rejected rather than guessed.
- Export always emits the newest supported version.

## Root document

| Property        | Type        | Required | Notes                              |
| --------------- | ----------- | -------- | ---------------------------------- |
| `schemaVersion` | literal `1` | yes      | Format discriminator.              |
| `id`            | string      | yes      | Opaque `form_` identifier.         |
| `title`         | string      | yes      | Human-readable form title.         |
| `description`   | string      | yes      | Plain text; HTML is not supported. |
| `locale`        | `en` / `ru` | yes      | Document and validation locale.    |
| `submitLabel`   | string      | yes      | Submit button text.                |
| `fields`        | array       | yes      | Ordered field nodes.               |
| `createdAt`     | ISO string  | yes      | Creation timestamp.                |
| `updatedAt`     | ISO string  | yes      | Last document change.              |

Unknown root properties are rejected.

## Field node

Every item in `fields` has the following shape:

| Property       | Type                      | Required | Notes                                  |
| -------------- | ------------------------- | -------- | -------------------------------------- |
| `id`           | string                    | yes      | Unique opaque `field_` identifier.     |
| `key`          | string                    | yes      | Unique submitted-value key.            |
| `type`         | field type                | yes      | See the allowed values below.          |
| `label`        | string                    | yes      | Plain text.                            |
| `description`  | string                    | yes      | Plain text help content.               |
| `placeholder`  | string                    | yes      | Plain text input hint.                 |
| `defaultValue` | string / number / boolean | no       | Must be compatible with `type`.        |
| `width`        | `full` / `half` / `third` | yes      | Responsive layout hint.                |
| `options`      | array of options          | yes      | Non-empty for select and radio fields. |
| `validation`   | validation object         | yes      | Use `{}` when no rules apply.          |
| `condition`    | condition object          | no       | Declarative field dependency.          |

Input field types:

```text
text, email, number, textarea, date, select, radio, checkbox, toggle
```

Display field types:

```text
heading, divider, section
```

Display fields do not contribute values to the submitted preview model. Rules that do not
apply to a field type should be rejected or removed by an explicit migration, never silently
executed.

## Option

Select and radio options contain:

```json
{
  "id": "option_550e8400-e29b-41d4-a716-446655440002",
  "label": "Email",
  "value": "email"
}
```

Option IDs and values must be unique within a field. Labels and values are plain text.

## Validation

The validation object can contain:

| Property    | Type    | Applies to                               |
| ----------- | ------- | ---------------------------------------- |
| `required`  | boolean | Value-producing controls.                |
| `minLength` | integer | Text, email, and textarea.               |
| `maxLength` | integer | Text, email, and textarea.               |
| `min`       | number  | Number fields.                           |
| `max`       | number  | Number fields.                           |
| `pattern`   | string  | Text-like fields; valid expression only. |

Cross-property validation requires `minLength <= maxLength` and `min <= max`. Patterns are
compiled defensively and subject to a length limit. Unsupported validation properties are
rejected.

## Conditions

Example:

```json
{
  "action": "show",
  "sourceFieldId": "field_550e8400-e29b-41d4-a716-446655440010",
  "operator": "equals",
  "value": "company"
}
```

Actions:

```text
show, enable
```

Operators:

```text
equals, notEquals, contains, isEmpty, isNotEmpty, greaterThan, lessThan
```

`isEmpty` and `isNotEmpty` do not require `value`. Other operators require a value
compatible with the source field. The source must exist, produce a value, and must not be
the target field. Cyclic dependencies are invalid.

## Canonical export

Exported files use:

- UTF-8 encoding;
- two-space JSON indentation;
- one final newline;
- stable property and field order;
- the `.json` extension;
- a sanitized filename derived from the form title;
- MIME type `application/json`.

Runtime-only preview values, selection, errors, and browser state are not exported.

## Import limits

The importer enforces these defensive limits before changing application state:

| Resource                       | Limit               |
| ------------------------------ | ------------------- |
| File size                      | 1 MiB               |
| Fields                         | 200                 |
| Options per field              | 100                 |
| Document, field, and option ID | 128 characters      |
| Key                            | 80 characters       |
| Form title                     | 120 characters      |
| Field and option label         | 200 characters      |
| Placeholder                    | 200 characters      |
| Submit label                   | 200 characters      |
| Description                    | 2,000 characters    |
| Scalar string/default value    | 2,000 characters    |
| Option value                   | 500 characters      |
| Pattern                        | 256 characters      |
| `minLength` / `maxLength`      | 0–100,000 inclusive |

The validator rejects dangerous property names such as `__proto__`, `prototype`, and
`constructor`, as well as unknown properties. Imported data is never merged recursively
into application prototypes.

## Error reporting

Import failures return all reasonably discoverable issues in document order:

```text
fields[1].key: key must be unique
fields[3].condition.sourceFieldId: source field does not exist
```

The current workspace remains unchanged after any error. A user may cancel after reviewing
the report.

## Compatibility test cases

Committed unit and browser tests should cover at least these fixtures or fixture builders:

- the smallest valid version 1 document;
- a document containing every supported field type;
- a Russian Unicode document;
- invalid duplicate keys and IDs;
- invalid condition references and cycles;
- unsafe property names and HTML-like text;
- oversized and excessive-depth samples generated during tests;
- an unknown future version and every older version once a migration is supported.
