---
name: handoff
description: Prepare a clean session handoff document to transition context to a fresh agent session or another engineer without conversational baggage. Use when the user asks /handoff, "hand off", "session transition", "prepare fresh session", or "wrap up for next dev".
---

# Handoff - Seamless Session & Agent Transition

The Handoff skill creates a structured, friction-free handoff artifact that allows a new session, teammate, or agent instance to pick up work immediately without having to re-read thousands of lines of past chat logs.

## When to Use
- Wrapping up a coding session or milestone.
- The context window is growing large and a fresh session is desired.
- Passing a task across team members or shifts.

## Handoff Document Generation
When invoked, generate or update a `HANDOFF.md` file (or provide a handoff block in response) containing:

1. **Context & Objective**:
   - Repository name, active branch, and remote push status.
   - Core problem statement and business objective.

2. **Completed Work & Modified Files**:
   - List of touched files with clickable markdown links.
   - Specific architectural choices made and why alternatives were rejected.

3. **Verification & Quality Checks**:
   - Unit test status (`npm test`, backend test status).
   - Linter results (`npm run lint`).
   - Build status (`npm run build`).

4. **Known Caveats & Blockers**:
   - Unresolved questions, pending user decisions, or environment requirements.

5. **Ready-to-Use Kickoff Prompt for Next Session**:
   - Provide a copy-pasteable prompt that the user or next agent can use to resume work immediately with zero ambiguity.
