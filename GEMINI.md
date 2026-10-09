# TrackIT & Help Center

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `.agents/skills/antislop/SKILL.md` (core) and then the skill for the task:
- UI / visual: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `.agents/skills/antislop-code/SKILL.md`

Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source.
<!-- antislop:end -->

## Core Workflow & Context Skills (Always Active)
Always apply the core principles from:
- `ponytail` (`.agents/skills/ponytail/SKILL.md`): Lazy senior dev mode. Smallest complete change, YAGNI, standard library and native platform features first, minimal code, zero bloat.
- `doctor` (`.agents/skills/doctor/SKILL.md`): Diagnose session health and detect bottlenecks.
- `rewind` (`.agents/skills/rewind/SKILL.md`): Clean rollbacks and checkpoint restorations.
- `compact` (`.agents/skills/compact/SKILL.md`): Structured context compaction on long threads.
- `handoff` (`.agents/skills/handoff/SKILL.md`): Seamless session transitions.
