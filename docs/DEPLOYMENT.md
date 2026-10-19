# Deployment

FormFlow Studio is deployed as a static Angular application with GitHub Pages.

## Production URL

<https://buinvschiislava.github.io/formflow-studio/>

## Repository settings

1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Keep the generated `github-pages` environment.
4. Recommended: protect `main` and require CI and E2E checks before merge.
5. Recommended: enable Dependabot alerts, security updates, secret scanning, and push
   protection where available.

## Build contract

GitHub Pages hosts a project site beneath `/formflow-studio/`. The workflow therefore builds
with:

```bash
npm run build:pages
```

Angular 22's application builder writes browser files to:

```text
dist/formflow-studio/browser
```

If the Angular output configuration changes, update `.github/workflows/deploy.yml` and test
asset URLs before merging.

The application uses hash routing so direct navigation does not depend on server-side SPA
rewrites. GitHub Pages always serves `index.html`, and Angular resolves the part after `#`.

## Automated workflow

On each push to `main`, the deployment workflow:

1. installs the pinned Node and npm dependencies;
2. runs formatting, lint, unit tests, and a production build;
3. uploads only the browser build as a Pages artifact;
4. deploys with `pages: write` and `id-token: write` permissions.

Pull requests never deploy. The deploy job is tied to the protected `github-pages`
environment, and concurrent older deployments are cancelled.

## Local production check

```bash
npm ci
npm run build
npx http-server dist/formflow-studio/browser -p 4173
```

Open <http://localhost:4173/> for the root-mounted smoke test. Run `npm run build:pages`
separately before publishing to verify the GitHub Pages base path; the deployment workflow
serves that build beneath `/formflow-studio/`.

## Post-deployment smoke test

Verify:

- the root URL returns HTTP 200 over HTTPS;
- JS, CSS, favicon, and font requests return 200;
- the console contains no errors;
- refresh and direct hash navigation work;
- add, edit, preview, export, and import flows work;
- a saved local document survives refresh;
- the page remains usable at a mobile viewport;
- the repository **About** field links to the live URL.

## Rollback

If a deployment is broken:

1. identify the last known-good release or commit;
2. revert the breaking commit through a pull request;
3. allow the normal deployment workflow to publish the reverted `main`;
4. run the smoke test;
5. document the cause and add a regression test.

Do not rewrite shared branch history to roll back a release.

## Releases

Use Semantic Versioning. Before creating a tag:

- all required checks pass;
- `CHANGELOG.md` is updated;
- documentation and screenshots match the application;
- supported browsers and keyboard use are checked;
- there are no known high or critical dependency vulnerabilities;
- the live Pages build passes the smoke test.

Create an annotated tag and GitHub Release:

```bash
git tag -a v1.0.0 -m "FormFlow Studio v1.0.0"
git push origin v1.0.0
```

Release notes should link to the demo and summarize features, fixes, compatibility changes,
and known limitations.
