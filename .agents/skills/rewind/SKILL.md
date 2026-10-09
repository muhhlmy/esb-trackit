---
name: rewind
description: Revert or rollback workspace changes, session state, or git checkpoints when a task takes a wrong turn or goes down an unproductive rabbit hole. Use when the user asks /rewind, "revert changes", "rollback", "go back to checkpoint", or to undo recent faulty edits.
---

# Rewind - Checkpoint & Workspace Rollback

The Rewind skill enables safe, precise reversal of workspace changes when an agent or session reaches an unproductive state, breaks working features, or veers off course.

## Workflow

1. **Safety First (Snapshot Before Rewind)**:
   - Before wiping any file or running hard resets, run `git diff` or `git status` to see what would be affected.
   - If there is uncommitted work that might contain useful snippets, create a safety stash or temporary branch (`git stash create` or `git branch backup-rewind-timestamp`).

2. **Determine Target Rollback Point**:
   - Check recent commits: `git log -n 5 --oneline`.
   - Identify the clean baseline commit (e.g., HEAD~1, origin branch, or specific commit hash).

3. **Execute Clean Rollback**:
   - For specific files that went wrong: `git restore <target-file>` or `git checkout HEAD -- <target-file>`.
   - For untracked debris: `git clean -fd`.
   - For entire branch rollback to last good commit: `git reset --hard <commit-hash>`.

4. **Verify Clean Baseline**:
   - Run `git status` to verify the working tree is in the intended clean state.
   - Run tests (`npm test`) to confirm tests pass on the restored baseline.
   - Report clearly what was reverted, what commit is active, and confirm readiness for the next direction.
