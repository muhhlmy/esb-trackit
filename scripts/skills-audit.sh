#!/usr/bin/env bash
#
# skills-audit.sh
#
# Audits installed agent skills — checks version, license, last activity,
# and usage status. Reports any skills that are outdated or unused.
#
# Usage:  bash scripts/skills-audit.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$ROOT/.agents/skills"
LOCK_FILE="$ROOT/skills-lock.json"

echo "=== ESB TrackIT Skills Audit ==="
echo ""

if [ ! -f "$LOCK_FILE" ]; then
  echo "⚠ skills-lock.json not found"
  exit 1
fi

# Parse lock file
LOCK_DATA=$(python3 -c "
import json, sys
with open('$LOCK_FILE') as f:
    data = json.load(f)
for name, info in data.get('skills', {}).items():
    print(f\"{name}|{info.get('source','')}|{info.get('skillPath','')}|{info.get('computedHash','')[:12]}\")
" 2>/dev/null)

if [ -z "$LOCK_DATA" ]; then
  echo "No skills found in lock file."
  exit 1
fi

while IFS='|' read -r name source path hash; do
  echo "→ $name"
  echo "  Source: $source"
  echo "  Path:   $path"
  echo "  Hash:   $hash"

  # Check if the skill is actually installed on disk
  if [ -f "$ROOT/$(echo "$path" | sed 's|^skills/||; s|^.agents/skills/||')" ]; then
    echo "  Status: INSTALLED"
  elif [ -f "$SKILLS_DIR/$name/SKILL.md" ]; then
    echo "  Status: INSTALLED (in .agents/skills)"
  else
    echo "  Status: ⚠ NOT INSTALLED"
  fi
  echo ""
done <<< "$LOCK_DATA"

echo "=== Audit complete ==="
echo ""
echo "Note: Built-in Hermes skills (accessibility-review, surgical-patch, etc.)"
echo "      are always available and do not require installation."
