# Plan: Week 1 — Foundation (Days 1-7)

**Created:** 2026-04-30
**Status:** Draft
**Request:** Stand up the Cookable app foundation per the 30-day build plan
**Relevant knowledge docs:** 04-build-plan.md, 05-tech-stack.md, 06-database-schema.md, 16-pre-launch-checklist.md

## Overview

Get the Cookable codebase to a state where Day 8 (AI integration) can start clean. By end of Week 1: project initialized, accounts created, auth working, camera screen functional, images uploading to Supabase storage.

## Current State

- `app/` directory exists but is empty (no Expo project)
- No accounts created yet (Apple Dev, Google Play, Supabase, AdMob, RevenueCat, PostHog, Anthropic)
- No domain registered
- All 16 knowledge docs in place; build doc split and indexed

## Proposed Changes

### Day 1-2 — Init & accounts
- Create accounts: Apple Developer ($99/yr), Google Play ($25), Supabase, AdMob, RevenueCat, Anthropic, PostHog, domain (cookable.app)
- Initialize Expo project in `app/` with TypeScript template
- Set up `.env.local` and `.env.example` patterns
- Configure Supabase project: create database, run schema migrations from `knowledge/06-database-schema.md`
- Set up RLS policies on every table

### Day 3-4 — Auth & navigation
- Install `@supabase/supabase-js`, `expo-apple-authentication`, `@react-native-google-signin/google-signin`
- Build auth flow: Apple sign-in (iOS first), Google sign-in (Android first)
- Create navigation shell: Expo Router file structure for Home / Camera / Recipes / Profile
- Create user profile row on first sign-in

### Day 5-7 — Camera & storage
- Install `expo-camera`, `expo-image-picker`, `expo-image-manipulator`
- Build camera capture screen
- Build photo library picker as fallback
- Resize images to max 1024px (long edge) before upload
- Upload to Supabase Storage `scan-images/{user_id}/{scan_id}.jpg` bucket
- Create `scans` row with image path; recipe generation comes Day 8

## Design Decisions

**Expo Router over React Navigation directly:** Standard for new Expo projects; file-based routing matches the screen taxonomy in the onboarding doc.

**Supabase JS client over a backend layer:** No backend code yet. RLS handles auth; we don't need a custom API for v1.

**Image resize on-device:** Saves bandwidth and Anthropic tokens. `expo-image-manipulator` handles this.

**Anonymous scans NOT supported in Week 1:** Per the onboarding flow, auth comes after first scan via modal. But for Week 1 dev, we'll require sign-in to test the storage flow. Anonymous-then-link logic comes Week 4 when onboarding is wired.

## Open Questions

1. **Domain provider:** Cloudflare or Namecheap? (Cloudflare gets the nod for free DNS + Workers if we ever need them.)
2. **Monorepo or single Expo app?** Recommend single Expo app for now. If a marketing site lives at `cookable.app`, host on Vercel from a separate repo or a `web/` subfolder later.
3. **Sentry now or later?** Recommend later (Week 4). PostHog covers analytics; crash reporting can wait until beta testing.

## Step-by-Step Tasks

### Day 1
1. Buy domain `cookable.app` (or fallback). Point to Vercel placeholder.
2. Create Apple Developer account
3. Create Google Play Developer account
4. Create Anthropic account, generate API key, store in password manager
5. Create Supabase account, create new project, save URL + anon key + service key
6. Create AdMob account
7. Create RevenueCat account, link to App Store Connect + Play Console (will fail until apps are submitted; that's OK)
8. Create PostHog account, get project API key
9. Update `CLAUDE.md` "Accounts ready" checklist

### Day 2
10. `cd "F:/Cookable App/app" && npx create-expo-app@latest . --template default-typescript`
11. Initialize git repo at `F:/Cookable App/`
12. Add `.gitignore` (node_modules, .env, .expo, dist, etc.)
13. Add `.env.example` with all required keys (Supabase URL, Supabase anon, Anthropic, PostHog, RevenueCat)
14. Run Supabase schema migrations (paste SQL from `knowledge/06-database-schema.md`)
15. Apply RLS policies on every table
16. Smoke test: `npm start` and verify the default Expo screen loads on iOS simulator and Android emulator

### Day 3
17. Install auth dependencies
18. Build `app/auth/sign-in.tsx` with Apple + Google buttons (Apple first on iOS, Google first on Android)
19. Wire Supabase auth + auto-create `users` row on first sign-in

### Day 4
20. Build navigation shell: Home, Camera, Recipes, Profile tabs (or stack — Expo Router decision)
21. Add basic screen components for each (placeholder content)
22. Add a `useUser()` hook for current user state

### Day 5
23. Install camera + image picker + manipulator
24. Build `app/(tabs)/camera.tsx` with capture button and gallery fallback
25. Implement image resize to 1024px long edge

### Day 6
26. Wire Supabase Storage upload
27. Create `scans` row on successful upload
28. Test on real device (iOS) — camera permission flow

### Day 7
29. Test on real device (Android) — camera permission flow
30. Fix any platform-specific bugs
31. Update `notes/journal.md` with Week 1 retro
32. Update `CLAUDE.md` "Build State" — Day 7 of 30, Week 1 complete

## Testing Plan

- iOS: simulator + at least one real iPhone (Justin's). Test camera, library picker, sign-in with Apple.
- Android: emulator + at least one real Android. Test camera, library picker, sign-in with Google.
- Verify images appear in Supabase Storage bucket
- Verify `scans` row exists after upload
- Verify RLS: a different test user cannot see another's scans

## Validation Checklist

- [ ] Expo project initializes and runs on both platforms
- [ ] All Week 1 accounts created and noted in CLAUDE.md
- [ ] Supabase schema applied; RLS confirmed via second test user
- [ ] Apple sign-in works on iOS
- [ ] Google sign-in works on Android
- [ ] Camera captures, resizes, uploads, and creates `scans` row
- [ ] `notes/journal.md` updated
- [ ] `CLAUDE.md` "Build State" reflects Day 7 of 30

## Success Criteria

- A user can install the dev build, sign in, and snap a photo that lands in Supabase Storage with a corresponding `scans` row.
- All Day 8 prerequisites are met: stack is live, auth works, image upload works.
