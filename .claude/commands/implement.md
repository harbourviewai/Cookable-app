# Implement

Execute an implementation plan from `plans/`.

## Variables

plan_path: $ARGUMENTS

---

## Phase 1: Understand

1. Read the plan file completely. Do not skim.
2. Read any knowledge docs the plan references.
3. Check for open questions or blockers. If any exist, stop and ask before proceeding.
4. Confirm plan status is Draft or Ready.

## Phase 2: Execute

1. Follow Step-by-Step Tasks in exact order.
2. Complete each step fully before moving to the next.
3. If creating a file, write the complete file — not a stub.
4. If modifying a file, read it first, then apply changes precisely.
5. If a step can't be completed as written, note the issue and adapt if intent is clear. Ask if unsure.
6. Apply Cookable brand and voice rules to every UI string and asset (sentence case, no banned words, no exclamations except specified cases).

## Phase 3: Validate

1. Run through the Validation Checklist from the plan.
2. Verify Success Criteria are met.
3. For UI changes: describe how to manually test on iOS and Android.
4. Ensure CLAUDE.md is updated if build state or workspace structure changed.
5. Ensure relevant knowledge docs are updated if a decision changed.

## Phase 4: Update Plan Status

Update the plan file:

1. Change Status to Implemented
2. Add an Implementation Notes section: date, summary of what was done, deviations from plan, issues encountered.

---

## Report

After implementation, provide:

1. Summary of work completed
2. Files created, modified, or deleted
3. Validation results
4. Deviations from plan (if any)
5. Next steps (if any)
