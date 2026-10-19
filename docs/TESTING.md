# Testing strategy

## Quality gates

A change is ready to merge when formatting, lint, unit tests, production build, Playwright
tests, and accessibility scans pass. A release also requires manual keyboard, responsive,
and screen-reader checks.

## Unit tests

Run once:

```bash
npm test
```

Run with coverage:

```bash
npm run test:coverage
```

Prioritize behavior with a high cost of failure:

- document and field factories;
- key normalization and uniqueness;
- immutable store commands;
- duplicate, delete, reorder, and condition remapping;
- schema parsing and cross-field invariants;
- unsupported-version and compatibility handling;
- deterministic serialization and round trips;
- Formly adapter mappings;
- persistence recovery from corrupt data;
- focus and keyboard behavior.

The CI-enforced floor is 85% statements, 85% lines, 90% functions, and 70% branches
overall. Validator, serializer, repository, and adapter modules also have focused boundary
and failure-path assertions; a percentage is not a substitute for those checks.

## Browser tests

Install browser binaries once and run Playwright:

```bash
npx playwright install
npx playwright test
```

Useful commands:

```bash
npx playwright test --project=chromium
npx playwright test --ui
npx playwright show-report
```

The Playwright web server starts the Angular development server automatically. Set
`PLAYWRIGHT_BASE_URL` to test an already deployed build.

### Core scenarios

- build a form, edit it, validate preview input, export it, and import it again;
- create and exercise a conditional field;
- duplicate, reorder, and delete a field;
- reject malformed or unsupported JSON without losing current work;
- restore locally persisted state;
- operate the editor by keyboard;
- use the editor at mobile and desktop viewport sizes;
- load the GitHub Pages hash route directly;
- complete automated axe scans with no serious violations.

## Import test matrix

Cover empty input, malformed JSON, BOM and whitespace, Unicode, wrong root types,
unsupported versions, unknown properties, duplicate IDs and keys, incompatible defaults,
missing condition sources, cycles, invalid patterns, dangerous property names, excessive
depth, too many fields/options, and oversized files.

Every accepted fixture should satisfy:

```text
parse(serialize(parse(input))) is equivalent to parse(input)
```

The serializer may normalize formatting and timestamps according to the documented
contract.

## Accessibility

Automated tests use `@axe-core/playwright`, but release testing also includes:

- keyboard-only add, select, edit, reorder, delete, import, export, and preview flows;
- visible focus and a logical focus order;
- dialog focus trap, Escape behavior, and trigger restoration;
- error association and live announcements;
- 200% and 400% zoom;
- reflow at 320 CSS pixels;
- light and dark color contrast;
- reduced-motion preference;
- NVDA with Chrome on Windows.

## Responsive matrix

At minimum, manually inspect:

| Viewport    | Purpose        |
| ----------- | -------------- |
| 320 × 568   | Narrow reflow  |
| 390 × 844   | Current mobile |
| 768 × 1024  | Tablet         |
| 1366 × 768  | Common laptop  |
| 1920 × 1080 | Wide workspace |

No essential operation should require horizontal page scrolling. Internal panes may scroll
when clearly indicated.

## Performance checks

- Lighthouse performance at least 90 on desktop and 85 on mobile.
- LCP below 2.5 seconds, INP below 200 ms, and CLS below 0.1 on the hosted build.
- Interactive editing of a 200-field fixture without visible input lag.
- Import of a maximum-size valid fixture without freezing the UI.
- No unbounded subscription, object URL, or DOM-node growth after repeated preview and
  import/export actions.

## Failure artifacts

CI stores Playwright traces, screenshots, videos, and the HTML report when an E2E run fails.
Unit coverage and production build output are uploaded for inspection. Do not commit these
generated directories.
