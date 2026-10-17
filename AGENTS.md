# AGENTS.md

Scriptorium is the documentation runtime for the whereareiam projects. A project keeps its docs in its
own repository (`docs/content`, `docs/assets`, optional `docs/components`, `scriptorium.project.json`); Scriptorium fetches them at
runtime, bundles every published version into Fumadocs pages, project components and a search index, and serves them from
one Next.js app. Content changes need no image build or redeployment.

## Packages

- `app`: the Next.js app. Routes, layouts, the search dialog, the proxy and edge cache policy, and the
  runtime and project configuration schemas.
- `packages/server`: what the app reads at request time: the active bundle, pages, sidebars, search
  indexes, readiness and health.
- `packages/server/api`: the models shared by the server, the worker and the app: project
  configuration, served bundle and page artifacts, versions.
- `packages/server/worker`: preparation in the background. It stages a source, bundles each version
  (includes, page artifacts, search), and publishes a generation only when it succeeds.
- `packages/server/worker/api`: the worker's contract with the app.
- `packages/source/api`, `packages/source/git`, `packages/source/local`: where content comes from, a
  git repository or a local folder, and the paths of the docs contract.
- `packages/trigger/api`, `packages/trigger/github`: what starts a preparation, such as a verified
  GitHub webhook.
- `packages/ui`: React components for MDX pages and the docs chrome.
- `example`: a project in the shape of the docs contract, used for local development.
- `scripts/verify-production.mjs`: checks the built app's cache headers and webhook handling.
- `docker`: the container entrypoint, which writes `scriptorium.json` from `SCRIPTORIUM_*` variables.

Keep a source's behavior in its source package and a trigger's in its trigger package; the worker and
the server only see their APIs.

## Build and test

- `bun install` once, then `bun run dev` serves `example/`. Point `app/scriptorium.json` at a project
  folder (`"source": { "type": "local", "target": "/path/to/project" }`) to serve that project.
- `bun run format` formats the code with Prettier; pull requests fail `bun run format:check` otherwise.
- `bun test` runs the tests; they sit next to the file they test as `<file>.test.ts`.
- `bun run typecheck` checks the app and every package it imports.
- `bun run build` builds the deployable app, and `bun run verify:production` checks it.

## Pull requests and releases

Build each change in its own `feature/...` branch and merge it into `dev` through a pull request.
Pull requests run the formatting check, the typecheck, the tests, the build and the production checks. Publishing a release
draft tags `dev` and runs the same checks on the tag; deployments build Scriptorium from the tag.

### Release notes

A merged pull request lands in the release draft as `* <title> ([#<number>](<url>))`, under the
category of its label. Readers run Scriptorium or publish a project with it.

- Titles use `Area: Description`, with a past-tense description of what changed: `Introduced`,
  `Changed`, `Fixed`, `Removed`.
- Areas: `Pages`, `Search`, `Versions`, `Translations`, `Sources`, `Webhooks`, `Cache`, `Runtime`,
  `Container`. Add an area only for a new part of Scriptorium, and add it to this list in the same pull
  request.

| Label            | Use for                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| `feature`        | something new for deployments or projects                                           |
| `change`         | changed behavior, configuration or docs contract                                    |
| `bug`            | a fix for a bug that shipped in a release                                           |
| `dependencies`   | a library update                                                                    |
| `skip-changelog` | refactors, build, CI, tests and documentation, and fixes of bugs that never shipped |

Add `major` next to the category when deployments or projects must change their configuration or
content on upgrade.

Text written by hand, the subtitle, the summary and upgrade notes, lives in `.github/release-notes.md`;
it replaces the draft's placeholders while its `version` matches the drafted version. The release
workflow stops while a placeholder is left.
