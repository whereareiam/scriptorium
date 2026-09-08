# Scriptorium

Scriptorium is the deployable docs runtime for per-project Fumadocs sites with multi-ref bundling.

It contains:

- `app/`: the Scriptorium Next.js app
- `packages/core/`: shared contracts, project config, and version metadata helpers
- `packages/runtime/source-git/`: git-backed runtime source implementation
- `packages/bundle/`: normalized bundle generation from a source
- `packages/runtime/`: runtime config, generation lifecycle, and readiness helpers
- `packages/runtime/worker/`: background preparation worker orchestration
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
    "dataDir": "/app/.scriptorium/runtime"
  },
  "triggers": {
    "webhook": {
      "secret": "change-me"
    }
  }
}
```

Runtime refresh is webhook-driven in `git` mode and file-watch-driven in `local` mode.
There is no scheduled refresh interval. A valid GitHub webhook returns `202` after
queueing preparation; check `/api/health/ready` and the bundle logs for completion.
Changes to docs, included partials, assets, project settings, and published versions
are bundled inside the running application. Content updates do not require an
image build or redeployment.
Transient Git DNS and connection failures get up to five attempts within that
preparation request. Network fetches run asynchronously so health checks remain responsive.

When the staged content is unchanged, the runtime logs `bundle_skipped` and keeps
the current content token, so open pages do not reload. A changed bundle is
published only after preparation succeeds; failed preparations keep the previous
content available. Git tags that move are synchronized into the disposable cache.
The active generation and its predecessor are retained. Older generations are
removed during subsequent preparation checks after a one-minute reader grace period.

The container uses `bun --smol server.js` and releases temporary compiler
allocations after preparation. For a small, lightly used documentation site,
`500m` CPU and `384Mi` memory limits are a starting point; measure your own corpus
and traffic before reducing them. Browser tabs check for updated content every
30 seconds while visible and immediately when they become visible again.
Startup bundling uses a shorter readiness poll. Published content refreshes use
an RSC request so an open tab can receive the new generation without reloading
an edge-cached HTML response.

For public documentation behind a shared cache, configure the CDN or reverse
proxy to respect the standard `CDN-Cache-Control` response header and the origin
browser TTL. Scriptorium emits `public, max-age=30` only when usable content
exists and the request is safe to share. It emits `no-store` for warmup, RSC/router
variants, cookies, authorization, health, and document query strings.

Apply the same request exclusions at the cache so a cached HTML response cannot
satisfy an RSC or private request. Webhooks must bypass caching. Provider-specific
header translation and cache rules belong in the deployment's ingress or proxy;
Scriptorium does not require a particular CDN. New visitors may see a previous
generation for up to the shared cache TTL; webhook processing remains immediate.

Webhook HMAC verification streams the raw body, rejects missing or malformed
signatures before reading it, and caps payloads at 25 MiB. Over-limit requests
receive HTTP 413. The webhook route should be excluded from browser challenges,
while application signature verification remains mandatory.

`scriptorium.project.json` groups version publishing under one `versions` block:

- `home`: the version users land on from `/docs`
- `include`: exact or wildcard branch/tag rules
- `meta`: optional labels and theme overrides for exact published versions

Build the deployable app with:

```bash
bun run build
```
