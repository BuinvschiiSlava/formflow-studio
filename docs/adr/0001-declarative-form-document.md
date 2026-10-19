# ADR 0001: Use a declarative application-owned form document

- Status: accepted
- Date: 2026-10-19

## Context

Formly can represent dynamic behavior with configuration values that include functions or
expression strings. Persisting raw Formly configuration would tightly couple exported files
to one library version and could turn JSON import into a code-execution boundary.

The editor also needs stable IDs, schema migrations, actionable validation errors, and
deterministic diffs.

## Decision

FormFlow Studio persists an application-owned `FormDocument` with an explicit
`schemaVersion`. Fields, validation, and conditional behavior are represented by enumerated,
declarative values. A one-way adapter derives Formly configuration for preview rendering.

Imported documents are strictly validated before entering application state. Executable
expressions and functions are not part of the format, and HTML-like strings remain plain text.

## Consequences

Benefits:

- imports remain data rather than executable configuration;
- documents can be migrated independently of Formly;
- validation errors can reference stable document paths;
- exports are suitable for review and version control;
- other renderers can consume the same document later.

Costs:

- every supported Formly capability needs an explicit domain representation and adapter;
- advanced arbitrary expressions cannot be imported;
- schema changes require compatibility decisions, migrations, tests, and documentation.

## Rejected alternatives

### Export raw `FormlyFieldConfig`

Rejected because it exposes library-specific internals, can contain executable values, and
does not provide a stable portable contract.

### Accept JavaScript expressions as strings

Rejected because validation and sandboxing would be unreliable and unnecessary for the
supported form workflows.

### Store only generated TypeScript

Rejected because TypeScript is not a safe interchange format and cannot be imported without
parsing executable source code.
