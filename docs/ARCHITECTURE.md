# Architecture

## Goals

FormFlow Studio is a browser-only editor for a portable dynamic-form document. Its
architecture is designed around four constraints:

1. exported data must be deterministic, versioned, and safe to import;
2. the domain model must not depend on Formly or Angular Material;
3. editing and preview state must have a single source of truth;
4. the application must remain deployable as static files.

## High-level data flow

```text
Palette / Inspector / Canvas
             |
             v
       Document store  <------ validated import
             |
             +-------> deterministic JSON export
             |
             v
        Formly adapter
             |
             v
       Read-only preview
```

The `FormDocument` is authoritative. The Formly configuration is derived and must never be
written back into the domain state.

## Layers

### Domain

The domain layer owns:

- `FormDocument`, `FormFieldNode`, conditions, validation, and options;
- document and field factories;
- key normalization and uniqueness;
- pure document operations;
- schema version constants.

It must not import Angular UI, Angular Material, Formly, browser storage, or file APIs. Pure
domain functions are the fastest and most important unit-test targets.

### Application state

The state layer owns the current document, selected field, derived validity, and editor
commands. It coordinates persistence but does not know how controls are rendered.

Rules:

- update state immutably;
- derive values with signals/computed state;
- keep selection and other UI-only state out of exported documents;
- update `updatedAt` only for meaningful document changes;
- make destructive actions explicit and reversible where possible.

### Features and UI

The builder workspace is composed of independently testable features:

- field palette;
- builder canvas;
- field card and keyboard reorder controls;
- property inspector;
- live preview;
- import/export dialogs;
- application shell and navigation.

Components dispatch editor commands and display state. They should not duplicate schema
validation or manually mutate nested document objects.

### Integrations

Boundary adapters isolate external representations:

- **Formly adapter:** converts safe domain fields to `FormlyFieldConfig` values.
- **Import validator:** parses unknown JSON and returns either a complete document or
  path-addressed issues.
- **Serializer:** emits stable, human-readable JSON.
- **Persistence adapter:** stores a validated document in browser storage.
- **File adapter:** reads and downloads JSON files.

## Document identity

Document, field, and option IDs are stable opaque values generated with
`crypto.randomUUID`. User-editable field keys are separate identifiers used in submitted
form data. Copying a document or field creates new IDs and remaps internal condition
references.

## Conditional behavior

Conditions are a small declarative language:

```text
source field + operator + comparison value + action
```

The supported actions are `show` and `enable`. Supported operators are explicitly
enumerated by the domain model. The Formly adapter interprets these data structures; the
importer never accepts executable functions or Formly expression strings.

Condition validation rejects missing sources, self-reference, and cycles. Display-only
elements cannot be condition sources when they do not produce a value.

## Import transaction

Import is all-or-nothing:

1. enforce file-size and text limits;
2. parse JSON without a reviver;
3. reject dangerous or unsupported object shapes;
4. validate the versioned schema;
5. validate cross-field invariants;
6. reject unsupported versions (future migrations must be explicit and tested);
7. create a detached document value;
8. replace state only after every check succeeds.

No partial field list is applied. Validation errors use document paths such as
`fields[2].condition.sourceFieldId` so the user can repair a file.

## Trust boundaries

The following inputs are untrusted:

- imported JSON;
- values typed into form labels, descriptions, placeholders, and options;
- browser storage left by an older or modified application;
- URL and hash values;
- filenames.

Defenses include strict runtime schemas, output escaping through Angular templates,
property allowlists, resource limits, and the absence of arbitrary expression execution.
Never use `[innerHTML]` for imported text.

## Persistence

Persistence is a convenience feature, not durable or confidential storage. A stored
document must pass the same runtime validation as an imported document before it enters the
store. Corrupt or incompatible values are ignored with a recoverable notification.

## Routing and hosting

The application uses hash routing. GitHub Pages can therefore serve every navigation from
the repository's static `index.html` without a server-side rewrite rule. The production
build uses `/formflow-studio/` as its base href.

## Accessibility architecture

- Native controls provide baseline semantics.
- The canvas exposes explicit move-up and move-down actions in addition to pointer drag.
- Dialogs trap focus and restore it to their trigger.
- State changes such as import completion and reorder actions are announced through a live
  region.
- Validation errors are associated with their inputs.

Automated axe checks are a guardrail; keyboard and screen-reader checks remain release
requirements.

## Architecture decisions

Record a short ADR under `docs/adr/` when a change affects document compatibility, security
boundaries, state ownership, or hosting. An ADR should describe context, decision,
consequences, and rejected alternatives.

Current decisions:

- [ADR 0001: Use a declarative application-owned form document](adr/0001-declarative-form-document.md)
