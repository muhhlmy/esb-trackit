---
name: compact
description: Compress active session history and conversation state into lightweight structured checkpoints to prevent context rot and token exhaustion. Use when the user asks /compact, "compress context", "summarize session", or during long conversations.
---

# Compact - Session State & Context Compaction

The Compact skill produces concise, high-signal summaries of long-running conversations to preserve critical context while discarding intermediate tool outputs, chat noise, and repetitive logs.

## When to Compact
- The conversation has had multiple rounds of debugging, tool invocations, or build logs.
- The user requests `/compact` or asks for a condensed status.
- Before embarking on a new major milestone within the same conversation.

## Compaction Structure
Produce a crisp summary following this format:

```markdown
### Session Checkpoint (Compacted)
- **Primary Goal**: One-line core objective.
- **Active Branch & Commit**: `<branch-name>` at `<short-hash>`.
- **Completed Milestones**:
  - Item 1 with clickable file link.
  - Item 2 with clickable file link.
- **Key Architectural Decisions**:
  - Decision rationale and constraints enforced.
- **Current Test Status**: Tests passing (e.g., Frontend X/X, Backend Y/Y).
- **Active Context / Next Priority**: Exactly what remains to be done next.
```

## Rules
- Omit raw terminal outputs, lengthy stack traces, and verbose step-by-step histories.
- Preserve all file paths as clickable links.
- Keep total compaction length under 40 lines.
