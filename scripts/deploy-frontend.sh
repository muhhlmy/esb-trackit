#!/usr/bin/env bash
# Deploy TrackIT frontend: build (umask 022) + sync ke web root nginx.
# www-data butuh o+rx lintas path; umask 022 menjamin 0755/0644.
# Usage: npm run deploy:frontend
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/frontend/dist"
WEB_ROOT="${WEB_ROOT:-/var/www/trackit/dist}"

echo "==> Build frontend (umask 022)"
cd "$REPO_ROOT/frontend"
(umask 022 && npm run build)

echo "==> Sync $SRC -> $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete "$SRC/" "$WEB_ROOT/"

# Defensive: www-data baca walau umask pemanggil bukan 022 (mis. via SSH non-login).
chmod -R o+rX "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod o+x {} +

echo "==> Web root siap:"
stat -c '%A %U:%G %n' "$WEB_ROOT" "$WEB_ROOT/index.html"
echo "Done. Reload nginx hanya perlu bila config berubah."
