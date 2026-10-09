---
name: doctor
description: Diagnose session health, token consumption, context rot, dependency conflicts, broken paths, and workspace configuration issues. Use when the user asks /doctor, "diagnose session", "why is context slow", "audit context", or to inspect agent environment health.
---

# Doctor - Session & Workspace Diagnostics

The Doctor skill audits the active workspace, session context health, and agent configuration to identify bottlenecks, token-draining bloat, broken paths, or environment issues.

## Diagnostic Checklist

1. **Context & Token Health**:
   - Check if the conversation is carrying large raw file outputs or monolithic build logs.
   - Identify if files larger than 1000 lines are repeatedly dumped into context instead of targeted slice reading.
   - Check for redundant test outputs or cyclic tool polling.

2. **Workspace & Git Cleanliness**:
   - Verify active branch (`git status`, `git branch -v`).
   - Check for uncommitted modified files or untracked debris.
   - Detect merge conflicts or detached HEAD states.

3. **Build & Dependency Verification**:
   - Check package.json dependencies and lockfiles for missing installations.
   - Run quick linter sanity check (`npm run lint` or `oxlint`).
   - Verify unit test suite baseline status (`npm test`).

4. **Environment & Container Status**:
   - Check presence of key tooling (Node, Docker, Git, CLI utilities).
   - Verify environment variables (.env, DB_PORT, JWT_SECRET, etc.).

## Remediation Output Format
Always present findings in a clean diagnostic report:
- **Status Summary**: Overall health (Healthy / Warning / Critical).
- **Detected Issues**: Bulleted list of detected bottlenecks with file references.
- **Immediate Fixes**: Specific one-line commands or file edits to resolve them.
