# Cookable

> Cook anything. Waste nothing.

This is the project workspace for **Cookable** — an AI app that turns whatever's in your fridge into 3 recipes you can cook tonight.

Claude Code operates as the build assistant inside this workspace. It has access to all knowledge docs, plans, notes, and the app codebase.

---

## Identity

**Owner:** Justin Booth (Harbourview AI / solo founder)
**Status:** Pre-build. Ready for development.
**Target launch:** ~30 days from build start
**Platforms:** iOS + Android via Expo (React Native)
**Markets:** US + Canada, English only

## North Star

Ship a polished MVP in 30 days that hits these gates:
- 4.5+ average rating in week 1
- 8-12% paywall to trial conversion
- 50-65% trial to paid conversion
- ~$600 MRR by month 3 (≈120 paying users)

Everything in this workspace exists to keep the build on schedule and on-brand.

## Build Priorities

1. **Camera → AI → Recipes** is the core magic loop. Ship that first, polish everything else around it.
2. **Editable ingredient list** is the safety net for AI errors. Non-negotiable.
3. **Paywall comes after the magic moment.** Never gate the first scan.
4. **Brand calm > brand loud.** Forest Pine + Saffron, food carries the warmth, UI stays calm.

---

## Workspace Structure

| Directory | Purpose |
|-----------|---------|
| `knowledge/` | Source of truth — the full build doc split into focused reference docs. Read by `/prime`. |
| `plans/` | Implementation plans created by `/create-plan`, executed by `/implement`. |
| `notes/` | Build journal, decision log, learnings, scratch notes. |
| `marketing/` | TikTok scripts, social copy, press list, launch playbook. |
| `assets/` | Brand assets — logo, icon, screenshots, color tokens. |
| `app/` | The Expo / React Native codebase. Empty until Day 1 of build. |
| `.claude/commands/` | Slash commands for this workspace. |
| `.claude/agents/` | Specialized subagents (e.g., `cookable-copywriter`). |

---

## Commands

| Command | Purpose |
|---------|---------|
| `/prime` | Initialize session — read CLAUDE.md, scan knowledge/, summarize state. Run this first every session. |
| `/create-plan` | Plan a non-trivial change (new feature, refactor, doc restructure) before touching files. |
| `/implement` | Execute a plan from `plans/`. |
| `/next-task` | Surface the next concrete task based on the 30-day build plan and current progress. |
| `/progress` | Snapshot of where the build stands vs. the 30-day plan and pre-launch checklist. |
| `/ship-check` | Run the pre-launch checklist (knowledge/16-pre-launch-checklist.md) against current state. Reports gaps. |

---

## Subagents

| Agent | Purpose | Tools |
|---|---|---|
| `cookable-copywriter` | Draft UI microcopy, paywall copy, push notifications, App Store copy, TikTok scripts in the Cookable voice. Enforces voice rules (sentence case, no banned words, no exclamation points except specific cases). | Read, Write |

---

## Voice Rules (memorize)

**Cookable IS:** Direct, warm, confident, practical, slightly clever, encouraging.
**Cookable IS NOT:** Vague, saccharine, cocky, aspirational, goofy, cheerleader-y.

- Sentence case for everything
- Contractions are fine
- No exclamation points except `Saved! ✓` style microcopy and recipe encouragement
- **Banned words:** amazing, delicious, yummy, scrumptious
- **Banned phrases:** "powered by AI", "AI-powered"
- Use "you" liberally
- Never use long dashes (--)

## Brand Quick Reference

- **Primary:** Forest Pine `#2D5F4E`
- **Accent:** Saffron `#E89B3C`
- **Background:** Linen `#FAF7F2`
- **Display font:** Fraunces (22pt+)
- **UI font:** Inter
- **Tagline:** Cook anything. Waste nothing.

Full brand system: `knowledge/12-brand-identity.md`

---

## Build State (update as you go)

- **Week:** Pre-build
- **Day:** 0 of 30
- **Last shipped:** —
- **Active blocker:** —
- **App codebase:** Not yet initialized
- **Accounts ready:** Apple Dev (no), Google Play (no), Anthropic (no), Supabase (no), AdMob (no), RevenueCat (no), PostHog (no), Domain (no)

Update this section weekly or when state changes meaningfully.

---

## Critical Rule: Keep This File Current

Whenever you change workspace structure, add a command, change build priorities, or hit a milestone — update CLAUDE.md. This file is the single source of truth for every future session.

---

## Session Workflow

1. Start: Run `/prime`
2. Check status: Run `/progress` if it's been a while
3. Plan changes: Use `/create-plan` for anything non-trivial
4. Execute: Use `/implement` against the plan
5. Maintain: Update CLAUDE.md and knowledge docs as decisions get made
