#!/usr/bin/env sh
set -eu

bun ./docker/entrypoint.mjs
exec "$@"
