# Security Policy

## Supported versions

Security fixes are applied to the latest `1.x` release, to `main`, and to the most recent
published release when practical.

| Version               | Supported |
| --------------------- | --------- |
| Latest release        | Yes       |
| `main`                | Yes       |
| Older tagged versions | No        |

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting for this repository:

1. Open the repository's **Security** tab.
2. Select **Advisories**.
3. Select **Report a vulnerability**.

Include:

- the affected version or commit;
- the attack scenario and expected impact;
- reproducible steps or a minimal proof of concept;
- affected browsers or operating systems;
- a suggested mitigation, if available.

You should receive an acknowledgement within seven days. Updates will be provided as the
report is validated and a fix is prepared. Please allow a reasonable remediation period
before public disclosure.

If private vulnerability reporting is unavailable, contact the maintainer through the
contact method on the GitHub profile and state only that you need a private security
channel. Do not send exploit details through public Telegram messages or issues.

## Security boundaries

The application is a static, local-first frontend and has no trusted backend. Therefore:

- imported JSON is always untrusted;
- the importer must reject executable expressions, functions, unknown properties,
  excessive nesting, and unsupported schema versions;
- the application must not use `eval`, `new Function`, or direct DOM HTML injection;
- imported labels and descriptions, including HTML-like strings, must always be rendered
  as text and never interpreted as HTML;
- local browser storage is convenience storage, not a secure secret store;
- the public demo must not request credentials or production secrets;
- no API keys or tokens belong in Angular environment files or the repository.

The supported import format and resource limits are documented in
[docs/JSON_SCHEMA.md](docs/JSON_SCHEMA.md).

## Dependency security

Dependabot monitors npm and GitHub Actions dependencies. Security alerts should be triaged
before routine version updates. A dependency update must still pass unit tests, browser
tests, and the production build.
