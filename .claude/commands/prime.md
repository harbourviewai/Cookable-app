# Prime

> Initialize the Cookable build session. Read context, scan knowledge, summarize state.

## Run

ls -la
find . -type f -name "*.md" -not -path "./app/node_modules/*" | head -40

## Read

CLAUDE.md
./knowledge/00-index.md
./knowledge/04-build-plan.md
./knowledge/16-pre-launch-checklist.md

(Skim other knowledge docs as needed during the session — don't load all 16 up front.)

## Summary

After reading, provide:

1. **Project + role:** What Cookable is, who Justin is, your role as build assistant
2. **Workspace structure:** Each top-level directory and what lives there
3. **Available commands:** prime, create-plan, implement, next-task, progress, ship-check
4. **Build state:** Current week/day, last shipped, active blocker (pull from CLAUDE.md "Build State" section)
5. **Voice + brand quick reference:** Tagline, primary colors, voice rules
6. **Confirmation:** That you're ready to build
