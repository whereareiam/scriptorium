# Security Policy

Scriptorium fetches project repositories with a token, accepts webhooks and serves the result publicly,
so a flaw in it can expose a private repository, let a forged webhook trigger work, or serve content a
project never published.

## Supported versions

Security fixes go into the next release built from `dev`. Only the latest release receives them; update
to it before reporting.

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub's private vulnerability reporting](https://github.com/whereareiam/scriptorium/security/advisories/new). Do not open a public issue, pull request, or Discord message with the details.

Include:

- the Scriptorium version and whether it runs from a git repository or a local folder
- what an attacker can do, and what they need for it
- steps to reproduce

You receive an answer on the report. The fix is released before the details are published, and the
release notes name it as a security fix.
