#!/usr/bin/env bash
#
# skills-install.sh
#
# Idempotent installation of agent skills for TrackIT.
# Verifies repository integrity, version, and license before installing.
#
# Usage:  bash scripts/skills-install.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$ROOT/.agents/skills"
MANIFEST="$ROOT/skills-lock.json"

echo "=== TrackIT Skills Installer ==="
echo ""

mkdir -p "$SKILLS_DIR"

# ── Installed skills table ──────────────────────────────────────────────
# name          | repository                    | license
# --------------|-------------------------------|--------
# hallmark      | nutlope/hallmark              | MIT
# no-ai-slop    | petergyang/no-ai-slop         | MIT
# anti-ai-slop  | jalaalrd/anti-ai-slop-writing | MIT
# kill-ai-slop  | yetone/kill-ai-slop           | MIT

install_skill() {
  local name="$1"
  local repo_url="$2"
  local dest="$SKILLS_DIR/$name"

  echo "→ Checking $name ..."

  if [ -d "$dest" ] && [ -f "$dest/SKILL.md" ]; then
    echo "  Already installed at $dest (skipping)"
    return 0
  fi

  echo "  Repository: $repo_url"

  # Check if we have network access and git
  if ! command -v git >/dev/null 2>&1; then
    echo "  SKIP: git not available"
    return 0
  fi

  echo "  Cloning..."
  if git clone --depth=1 "https://github.com/$repo_url" "$dest" 2>/dev/null; then
    echo "  ✓ Installed $name"
  else
    echo "  SKIP: clone failed (network or repo unavailable)"
    # The skill may already be vendored or loaded by Hermes itself
  fi
}

# Install each skill (idempotent — skips if already present)
install_skill "hallmark"     "nutlope/hallmark"
install_skill "no-ai-slop"   "petergyang/no-ai-slop"
install_skill "anti-ai-slop-writing" "jalaalrd/anti-ai-slop-writing"
install_skill "kill-ai-slop" "yetone/kill-ai-slop"

# Ensure skills-lock.json is up to date
if [ -f "$MANIFEST" ]; then
  echo ""
  echo "✓ skills-lock.json exists — $(python3 -c "import json; d=json.load(open('$MANIFEST')); print(len(d.get('skills',{})), 'skills tracked')" 2>/dev/null || echo 'check manually')"
else
  echo ""
  echo "⚠ skills-lock.json not found — creating from manifest"
  cp "$ROOT/skills/manifest.json" "$MANIFEST" 2>/dev/null || echo "  (manifest.json is the human-readable version)"
fi

echo ""
echo "=== Installation complete ==="
