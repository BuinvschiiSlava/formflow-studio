# Contributing to FormFlow Studio

Thank you for helping improve FormFlow Studio. Small, focused changes with tests are the
easiest to review.

## Before opening an issue

- Search existing issues and discussions.
- Use a bug report for reproducible incorrect behavior.
- Use a feature request for a new workflow or field capability.
- Report suspected vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Local setup

```bash
nvm use
npm ci
npm start
```

The repository uses the Node major in `.nvmrc` and the npm version declared in
`package.json`. Do not replace `npm ci` with a command that silently rewrites the lockfile.

## Development principles

- Keep the `FormDocument` domain model independent from Formly and Angular Material.
- Treat imported JSON as untrusted data.
- Do not introduce `eval`, `new Function`, executable expression strings, or raw imported
  HTML.
- Prefer small standalone components with explicit responsibilities.
- Use immutable state updates and derived state instead of duplicate mutable state.
- Use native semantic HTML before ARIA and provide keyboard alternatives to drag-and-drop.
- Preserve deterministic JSON output and backwards compatibility within a schema version.
- Add or update tests whenever behavior changes.

## Branches and commits

Create a short branch from `main`, for example:

```text
feat/field-condition-editor
fix/import-duplicate-keys
docs/json-schema-example
```

Use Conventional Commit prefixes:

```text
feat: add number range validation
fix: preserve option order after import
docs: explain schema version policy
test: cover cyclic field conditions
refactor: isolate formly adapter
chore: update development dependency
```

## Checks

Run these checks before opening a pull request:

```bash
npx prettier --check . --ignore-unknown
npm run lint
npm run test:coverage
npm run build
npm run e2e
```

Install Playwright's browser once if necessary:

```bash
npx playwright install chromium
```

To run the optional Firefox and WebKit matrix locally, install all three browsers with
`npx playwright install` and run `npm run e2e:all`.

## Tests

- Unit-test domain operations, validation, serialization, compatibility handling, and the Formly
  adapter.
- Add component tests for keyboard and focus behavior.
- Add E2E coverage for user-visible workflows, not implementation details.
- Include valid and invalid fixtures for changes to the JSON format.
- Run an axe scan for new screens and manually verify keyboard use.

See [docs/TESTING.md](docs/TESTING.md) for the complete quality strategy.

## Pull requests

A pull request should:

- explain the user problem and the chosen solution;
- stay focused on one coherent change;
- link its issue when one exists;
- include screenshots or a short recording for visible UI changes;
- include tests and documentation updates;
- keep all CI checks green;
- avoid unrelated generated or formatting changes.

Maintainers may request that a large change be split into smaller pull requests.

## Changing the document schema

Any change to persisted or exported data requires:

1. an update to the domain type and runtime validator;
2. a compatibility decision and, when necessary, a migration;
3. round-trip and invalid-input tests;
4. an update to `docs/JSON_SCHEMA.md` and `CHANGELOG.md`;
5. confirmation that an older exported fixture still imports correctly.

Never reinterpret an existing property incompatibly without increasing `schemaVersion`.

## Accessibility

New interactions must work with keyboard alone, preserve visible focus, expose an
accessible name, and remain usable at 200% zoom and a 320 CSS-pixel viewport. Validation
errors must be programmatically associated with their fields.

## Code of Conduct

Participation in this project means following [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
