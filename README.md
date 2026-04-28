# Scriptorium

Scriptorium is a shared docs runtime for per-project Fumadocs sites with multi-ref bundling.

It contains:

- `packages/site-runtime`: reusable runtime, ref staging CLI, repo sync, and webhook support
- `templates/project-docs`: internal deployable Next/Fumadocs app

Consumer contract:

- `docs/content/**`: bundled documentation files
- `docs/assets/**`: project branding assets
- `scriptorium.project.json`: project metadata and ref policy

The default ref policy publishes:

- the configured default ref
- `release/*` branches
- all tags

## Consumer contract

Consumer repositories only need:

- `docs/content/**`
- `docs/assets/**`
- `scriptorium.project.json`

The deployed Scriptorium app is configured with:

- repository URL
- default branch
- webhook secret
- optional Git auth token

and fetches content from the consumer repo at runtime.

## Local development

Run the starter example directly from the repo root:

```bash
npm install
npm run dev
```

Useful variants:

- `npm run dev:runtime`: rebuild the shared runtime package
- `npm run dev:example`: run the starter example directly
