# Decision Log

Significant decisions, dated, with rationale. New entries go on top.

---

## 2026-04-30 — Single-call AI pipeline for v1

**Decision:** Use a single Claude Sonnet 4.5 call (image in → ingredients + 3 recipes JSON out) rather than a two-step pipeline.

**Rationale:** Lower complexity, faster to ship. Cost per scan ~$0.04-0.06 is acceptable at MVP scale. Can split into Haiku (detection) + Sonnet (recipes) later if costs become a problem.

**Source:** `knowledge/07-ai-prompt-spec.md`

---

## 2026-04-30 — Auth happens AFTER first scan

**Decision:** No sign-in required for the first scan. Auth gate appears as a modal after recipes are generated.

**Rationale:** Get to the magic moment as fast as possible. Auth before value is a conversion killer. RevenueCat + Supabase can handle anonymous sessions until the user signs in.

**Source:** `knowledge/08-onboarding-copy.md` Screen 7

---

## 2026-04-30 — No email/password sign-in

**Decision:** Apple + Google only. No email/password.

**Rationale:** Less code, less abuse surface, faster onboarding. Mobile users overwhelmingly prefer social sign-in. Re-evaluate if we hit a real demand signal.

**Source:** `knowledge/03-mvp-scope.md`
