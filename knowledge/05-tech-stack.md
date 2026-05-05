# Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React Native (Expo) | One codebase, iOS + Android, fast iteration |
| Backend | Supabase | Auth + Postgres + storage in one, RLS-ready |
| AI / Vision | Claude Sonnet 4.5 (Anthropic API) | Single call: image in → ingredients + recipes JSON out |
| Payments | RevenueCat | Cross-platform subs, paywall A/B testing built-in |
| Ads | Google AdMob (non-personalized mode) | Avoids ATT prompt; standard SDK |
| Analytics | PostHog (free tier) | Funnel tracking, feature flags |
| Push notifications | Expo Notifications | Native to Expo, free |
| Hosting | Vercel (marketing site) + Supabase | $0 to start |

## Cost estimates

- **Estimated infra cost month 1:** ~$0-25 (mostly API calls)
- **Cost per scan:** ~$0.04-0.06 with Claude Sonnet 4.5 + vision

## Future cost optimization (if needed at scale)

- Two-step pipeline: Haiku for ingredient detection, Sonnet for recipe generation. Cuts cost ~40%.
- Don't optimize prematurely — ship single-call Sonnet 4.5 v1, measure, iterate.
