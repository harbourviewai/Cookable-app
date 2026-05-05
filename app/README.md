# Cookable App

This directory will hold the Expo / React Native codebase for Cookable.

It's intentionally empty until **Day 1 of the build**, when you'll initialize the project here:

```bash
cd "F:/Cookable App/app"
npx create-expo-app@latest . --template
```

Once initialized, this folder is the root of the app — `package.json`, `app.json`, `app/` (Expo Router), `components/`, etc., all live here.

Hosting / deployment will also be configured from this folder (EAS Build for native binaries, Vercel for the marketing site if it lives in a subdir).

**Until then:** see `../knowledge/04-build-plan.md` for the schedule and `../knowledge/05-tech-stack.md` for the stack decisions.
