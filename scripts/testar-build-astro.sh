#!/usr/bin/env bash
set -euo pipefail
NODE_ENV=development npm run build
test -f dist/index.html || { echo "build: falta dist/index.html" >&2; exit 1; }
echo "build astro ok"
