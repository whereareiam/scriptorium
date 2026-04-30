# Scriptorium

Scriptorium is the deployable docs runtime for per-project Fumadocs sites with multi-ref bundling.

It contains:

- `src/`: the Scriptorium app, runtime logic, routes, and staging helpers
- `example/`: a minimal consumer-shaped fixture used for local development

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

Run the Scriptorium app against the local example fixture:

```bash
bun install
bun run dev
```

Production-like local preview of the built app:

```bash
bun run build
bun run dev:built
```

The local example lives in `example/` and mirrors the consumer contract:

- `example/docs/content/**`
- `example/docs/assets/**`
- `example/scriptorium.project.json`

Build the deployable app with:

```bash
bun run build
```
