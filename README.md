# Scriptorium

Scriptorium is the deployable docs runtime for per-project Fumadocs sites with multi-ref bundling.

It contains:

- `app/`: the Scriptorium Next.js app
- `packages/server/`: request-time access to the active bundle, pages, search and readiness
- `packages/server/api/`: shared models for project configuration, bundles and pages
- `packages/server/worker/`: background preparation that bundles every published version
- `packages/source/`: the git and local content sources and the docs contract paths
- `packages/trigger/`: what starts a preparation, such as GitHub webhooks
- `packages/ui/`: Scriptorium-specific React/UI helpers
- `example/`: a minimal consumer-shaped fixture used for local development

See [AGENTS.md](AGENTS.md) for how the packages fit together and how changes are released.

Consumer contract:

- `docs/content/**`: bundled documentation files
- `docs/assets/**`: project branding assets
- `docs/components/*.tsx`: optional MDX components of the project
- `docs/i18n/<language>/**`: optional translations of `docs/content`
- `scriptorium.project.json`: project metadata and published-version policy

## Consumer contract

Consumer repositories only need:

- `docs/content/**`
- `docs/assets/**`
- `scriptorium.project.json`

and may add `docs/components/**` and `docs/i18n/**`.

Shared doc-only partials can live under `docs/content/_partials/**` and be reused from MDX with:

```mdx
<Include src="./_partials/shared-proxy.mdx" />
```

Those partials are expanded at compile time, so they stay out of navigation as standalone pages while remaining part of the page's compiled content for things like search and table-of-contents extraction.

## Navigation

The top of the sidebar holds two menus:

- **Version**: the published branches and tags, shown when there is more than one. Switching keeps
  the reader on the same page when the other version has it, and opens its start page otherwise.
- **Sections**: one entry per root folder. Mark a folder as a section with `"root": true` in its
  `meta.json`; the sidebar then shows only the section the reader is in, and the menu switches
  between sections, for example one per audience:

  ```text
  docs/content/
    meta.json              { "pages": ["index", "server", "reference", "developers", "contributing"] }
    server/meta.json       { "title": "Server admins", "description": "Install and run", "root": true }
    reference/meta.json    { "title": "Configuration reference", "root": true }
    developers/meta.json   { "title": "Developers", "root": true }
    contributing/meta.json { "title": "Contributing", "root": true }
  ```

  A section's `description` is shown under its title in the menu. On a page outside every section,
  such as the start page, the sidebar shows the whole tree and the menu offers the sections.

Folders, sections and pages can carry a [Lucide](https://lucide.dev/icons) icon in the sidebar:
`"icon": "BookOpen"` in a folder's `meta.json`, or `icon: BookOpen` in a page's frontmatter. The name
may also be written in lowercase or kebab-case (`book-open`); an unknown name shows no icon.

## Configuration references

`<Setting>` describes one field of a configuration reference:

```mdx
<Setting
  name="server.port"
  takes="1-65535"
  default="8080"
  affects="The port the server listens on. Takes effect after a restart."
  flag="advanced"
>
  Further explanation, as any MDX.
</Setting>
```

- `name` becomes a heading, so each field has an anchor, an entry in the table of contents and a
  search result. `depth` sets the heading level (3 by default) and `id` the anchor, which is otherwise
  derived from the name (`server.port` → `#serverport`).
- `takes`, `default` and `affects` are optional. In them, text in backticks is shown as code, as in
  ``takes="an integer from `0` to `4`"``; a `default` without backticks is shown as code as a
  whole. They also take MDX, such as `takes={<>one of <code>RANDOM</code> or <code>OFFLINE</code></>}`.
- `flag` marks the setting with a label and a coloured rule down its side: `advanced`, `warning`,
  `danger`, `experimental` or `reserved`.
- Its labels (Takes, Default, Affects and the badges) follow the page's language; Scriptorium ships
  them in English and Russian.
- Write the tag over several lines as above: Fumadocs indexes a one-line element as a sentence of
  text, so a one-line `<Setting ... />` gets no search entry of its own.

## File trees

`<Files>`, `<Folder>` and `<File>` are the [Fumadocs file tree](https://fumadocs.dev/docs/ui/components/files):

```mdx
<Files>
  <Folder
    name="docs"
    defaultOpen
  >
    <File name="index.mdx" />
  </Folder>
  <File name="scriptorium.project.json" />
</Files>
```

They take the names of the Lucide `File` and `Folder` icons, which stay available as `FileIcon` and
`FolderIcon`.

## Project components

A project can ship its own MDX components with its docs. Each `docs/components/<Name>.tsx` (or
`.jsx`) whose name starts with a capital letter becomes `<Name>` on every page and translation of
the same version:

```tsx
// docs/components/ReleaseCard.tsx
import { Card } from 'fumadocs-ui/components/card'
import { Badge } from '@scriptorium/ui'

export default function ReleaseCard({ version, children }) {
  return (
    <Card title={`Release ${version}`}>
      <Badge type="success">Stable</Badge>
      {children}
    </Card>
  )
}
```

```mdx
<ReleaseCard version="1.2.0">Pages keep their place when you switch versions.</ReleaseCard>
```

- The file exports the component as its default export or under its own name. Other files, such as
  `docs/components/lib/format.ts`, are only used through imports.
- Components are bundled during preparation, per version: each branch and tag renders with the
  components it contains. In local mode, saving a component prepares the docs again.
- A component can import `react`, `react/jsx-runtime`, `lucide-react`, the Fumadocs UI components
  (`fumadocs-ui/components/accordion`, `banner`, `callout`, `card`, `codeblock`, `files`, `heading`,
  `image-zoom`, `inline-toc`, `steps`, `tabs`, `type-table`), Scriptorium's own components from
  `@scriptorium/ui`, and files inside `docs/components`. Scriptorium provides these; nothing is
  installed for the project. Any other package, a Node built-in such as `fs`, or a file outside
  `docs/components` fails the preparation with the file and line, and the previous content stays
  online.
- Components render on the server, like the rest of the page: they cannot use state or effects
  (`useState`, `useEffect`) or add their own client code, but they can use the provided interactive
  components such as tabs and accordions.
- A component cannot take the name of a built-in one (`Callout`, `Tabs`, `Setting`, a Lucide icon,
  and so on); preparation fails instead. To replace a built-in on purpose, add
  `export const override = true` to the file.
- Search and the table of contents read the page's MDX, as for built-in components: headings and text
  written in the page are indexed, text a component produces by itself is not.

Components run with the same trust as the pages: they come from the branches and tags the deployment
publishes, and render inside the Scriptorium server.

## Translations

`docs/content` stays the only source of truth. A translation lives beside it, mirrors its paths, and only holds the pages that are translated:

```text
docs/
  content/
    meta.json
    configuration/index.mdx
    installation/_partials/startup-failure.mdx
  i18n/
    check.sh                                     copy of scripts/i18n-check.sh
    ru/
      meta.json                                  title and labels only
      configuration/index.mdx
      installation/_partials/startup-failure.mdx
```

List the languages in `scriptorium.project.json`. The default language is the one `docs/content` is written in:

```json
"i18n": {
  "default": "en",
  "languages": {
    "en": { "label": "English" },
    "ru": { "label": "Русский" }
  }
}
```

What readers get:

- `/docs/<version>/...` stays the default language; a translation is served at `/ru/docs/<version>/...`.
- The language menu in the sidebar switches to the same page and version. Readers whose browser prefers a published language are offered it once, in that language.
- A page without a translation shows the original with a note, so a translation can grow page by page. A page whose original changed after it was translated shows the translation with a note and a link to the original.
- Search, the sidebar and the interface texts follow the language. Scriptorium ships interface texts for English and Russian; other languages get the English ones.
- A version without `docs/i18n/<language>/` is published in the default language only.

How translations are built:

- A translated `meta.json` doesn't decide which pages exist or their order; that stays with `docs/content`. It sets `title` and `description` and translates separator and link texts through `labels`, for example `{ "title": "Документация", "labels": { "Getting Started": "Начало работы" } }`.
- Includes resolve the translated partial when there is one and the original otherwise. A partial that only holds code or configuration needs no translation.
- A translation whose page no longer exists in `docs/content` is left out and logged.

### Keeping translations current

Each translated page records which version of its original it follows: `sourceHash` in its frontmatter is the git blob hash of the `docs/content` file it was translated from. When the original changes, the hash no longer matches, and the site and `check.sh` both report the translation as outdated.

Copy [`scripts/i18n-check.sh`](scripts/i18n-check.sh) to `docs/i18n/check.sh` in the project. It needs only git and a POSIX shell:

```bash
docs/i18n/check.sh                                   # fails on outdated, unstamped or orphaned translations
docs/i18n/check.sh stamp docs/i18n/ru/faq/index.mdx  # record the current original after translating
docs/i18n/check.sh status                            # translated, outdated and untranslated pages per language
docs/i18n/check.sh update                            # take the latest version of the script
```

For an outdated translation it prints the diff of the original since the translation was made, so only the changed part needs work.

Run it where changes are made, so nobody has to remember it:

- a git pre-commit hook running `docs/i18n/check.sh --staged`, which checks the translations the commit touches, as staged;
- a CI step running `docs/i18n/check.sh`, which catches commits made without the hook. Git history is only needed for the diff (`fetch-depth: 0`), not for the check itself.

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
- `example/docs/components/**`
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
