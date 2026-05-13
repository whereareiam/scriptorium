# Scriptorium

Scriptorium is the deployable docs runtime for per-project Fumadocs sites with multi-ref bundling.

It contains:

- `app/`: the Scriptorium Next.js app
- `packages/core/`: shared contracts, project config, and version metadata helpers
- `packages/source-git/`: git-backed source implementation
- `packages/bundle/`: normalized bundle generation from a source
- `packages/runtime/`: runtime config, paths, snapshot refresh, and webhook helpers
- `packages/content/`: bundled content access, docs-source helpers, and theme helpers
- `packages/ui/`: Scriptorium-specific React/UI helpers
- `example/`: a minimal consumer-shaped fixture used for local development

Consumer contract:

- `docs/content/**`: bundled documentation files
- `docs/assets/**`: project branding assets
- `scriptorium.project.json`: project metadata and published-version policy

## Consumer contract

Consumer repositories only need:

- `docs/content/**`
- `docs/assets/**`
- `scriptorium.project.json`

Shared doc-only partials can live under `docs/content/_partials/**` and be reused from MDX with:

```mdx
<Include src="./_partials/shared-proxy.mdx" />
```

Those partials are expanded at compile time, so they stay out of navigation as standalone pages while remaining part of the page's compiled content for things like search and table-of-contents extraction.

The deployed Scriptorium app is configured with:

- source type (`git` today, with room for additional source adapters)
- repository URL
- default branch
- webhook secret
- optional Git auth token
- optional Git auth username (`x-access-token` by default)

and fetches content from the consumer repo at runtime.

The production runtime sync path uses `isomorphic-git`, so the deploy image does not need the system `git` binary.

## Local development

Run the Scriptorium app against the local example fixture:

```bash
bun install
bun run dev
```

Run the Scriptorium app against a real local consumer repo such as `Identica`:

```bash
cat > app/scriptorium.json <<'EOF'
{
  "source": {
    "type": "local",
    "target": "/absolute/path/to/Identica"
  }
}
EOF

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

For local development, the app reads `app/scriptorium.json` when present.
When that file is absent, it defaults to local mode against `../example`.

In the container image, `docker/entrypoint.sh` reads `SCRIPTORIUM_*` environment variables
or `SCRIPTORIUM_CONFIG_JSON`, writes `scriptorium.json` before starting the app, and
then launches the configured command. The app itself does not read environment variables directly.

Example git-backed config:

```json
{
  "source": {
    "type": "git",
    "target": "https://github.com/whereareiam/Identica.git",
    "defaultBranch": "dev",
    "auth": {
      "token": "your-token-here",
      "username": "x-access-token"
    }
  },
  "runtime": {
    "refreshIntervalSeconds": 900,
    "dataDir": "/app/.scriptorium/runtime"
  },
  "triggers": {
    "webhook": {
      "secret": "change-me"
    }
  }
}
```

`scriptorium.project.json` groups version publishing under one `versions` block:

- `home`: the version users land on from `/docs`
- `include`: exact or wildcard branch/tag rules
- `meta`: optional labels and theme overrides for exact published versions

Build the deployable app with:

```bash
bun run build
```
