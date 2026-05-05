# Plan

Create a detailed implementation plan for a Cookable change before touching files.

## Variables

request: $ARGUMENTS

---

## Instructions

- You are creating a PLAN, not implementing changes. Research thoroughly, think deeply, then output a plan document.
- Use reasoning capabilities to think hard about the request, the build doc, existing code, and the right approach.
- Research the workspace AND the relevant knowledge docs to understand how this change fits the broader product.
- Create the plan in `plans/` with filename: `YYYY-MM-DD-{descriptive-name}.md`
- Be thorough — this plan will be executed by `/implement` and needs enough detail to execute without ambiguity.
- Follow existing patterns. If we're adding code, study similar files in `app/` first.

## Research Phase

Before writing the plan, investigate:

1. Read `CLAUDE.md` for current build state
2. Read the relevant `knowledge/` docs (the index points to them)
3. If creating a feature: read existing screens/components in `app/` for patterns
4. If modifying brand or copy: re-read `12-brand-identity.md` and the voice rules
5. Understand how this change fits the 30-day build plan (`04-build-plan.md`)

## Plan Format

Use this structure:

# Plan: [descriptive title]

**Created:** YYYY-MM-DD
**Status:** Draft
**Request:** [one-line summary]
**Relevant knowledge docs:** [list which knowledge/* docs apply]

## Overview
What this accomplishes and why it matters for Cookable.

## Current State
Existing code/structure and gaps being addressed.

## Proposed Changes
Summary of new files, files to modify, files to delete. Include full paths.

## Design Decisions
Key decisions with rationale. Alternatives considered. Open questions.

## Step-by-Step Tasks
Numbered steps with specific actions and files affected. Detailed enough to execute without ambiguity.

## Testing Plan
How will we verify this works on iOS and Android (where applicable)?

## Validation Checklist
- [ ] Code/feature works end-to-end
- [ ] Brand voice rules followed (sentence case, no banned words, etc.)
- [ ] CLAUDE.md updated if build state or structure changed
- [ ] Relevant knowledge doc updated if a decision changed

## Success Criteria
Specific, measurable criteria for completion.

---

## Report

After creating the plan:
1. Brief summary of what the plan covers
2. Any open questions needing input before implementation
3. Full path to the plan file
4. Remind to run `/implement [plan-path]` to execute
