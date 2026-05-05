# Next Task

Surface the next concrete task to work on, based on the 30-day build plan and current build state.

## Read

CLAUDE.md  (for "Build State" section — current week, day, blockers)
./knowledge/04-build-plan.md  (the 30-day schedule)
./knowledge/16-pre-launch-checklist.md  (what's still unchecked)
./plans/  (any in-flight plans not yet implemented)

## Logic

1. Determine current build day from CLAUDE.md "Build State"
2. Cross-reference against the 30-day plan
3. Check for any in-flight plans in `plans/` that are Draft or Ready but not Implemented
4. Check for active blockers in CLAUDE.md
5. Check the pre-launch checklist for any items that should be unblocked but aren't

## Output

Provide a single recommendation in this format:

**Next task:** [one-line description]

**Why this:** [brief rationale — schedule slot, blocker clearance, dependency unlock]

**How to start:**
- [step 1]
- [step 2]
- [step 3]

**Estimated time:** [in hours or days]

**Knowledge docs to reference:** [list]

**Suggested command:** [`/create-plan` for non-trivial work, or just dive in if simple]

If multiple tasks are tied for "next," pick one and explain why. Don't list five options — pick one.
