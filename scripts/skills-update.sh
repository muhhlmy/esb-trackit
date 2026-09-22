#!/usr/bin/env bash
#
# skills-update.sh
#
# Updates installed agent skills. Respects already-vendored skills
# and only updates those that can be safely pulled.
#
# Usage:  bash scripts/skills-update.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$ROOT/.agents/skills"

echo "=== ESB TrackIT Skills Updater ==="
echo ""

if [ ! -d "$SKILLS_DIR" ]; then
  echo "No skills directory found. Run skills-install.sh first."
  exit 1
fi

for skill_dir in "$SKILLS_DIR"/*/; do
  [ -d "$skill_dir/.git" ] || continue
  skill_name="$(basename "$skill_dir")"
  echo "→ Updating $skill_name ..."
  cd "$skill_dir"
  git pull --ff-only 2>/dev/null && echo "  ✓ Updated" || echo "  — Already up to date or no remote"
  cd "$ROOT"
done

echo ""
echo "=== Update complete ==="
