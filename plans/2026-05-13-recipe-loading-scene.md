# Plan: Recipe Loading Scene

**Created:** 2026-05-13
**Status:** Implemented
**Request:** Replace the "photo + bottom spinner overlay" during the `analyzing` phase with a branded full-screen loading scene — Linen background, Pine bowl illustration, Saffron steam swirl animated above it, time-cycled Fraunces caption.
**Relevant knowledge docs:** `10-microcopy.md`, `12-brand-identity.md`, `04-build-plan.md` (Day 26 — polish window), `07-ai-prompt-spec.md` (typical Edge Function latency)

---

## Overview

Today, after a user confirms their fridge photo, the screen keeps showing the still photo with a small white spinner + "Looking at your fridge…" pill at the bottom while the Edge Function calls Claude. That wait is 5–15s and is the longest single beat in the whole app — the moment that, if it feels broken, costs us a star.

The pill reads as "still uploading"; the static photo gives no signal that the AI phase has begun. We're going to swap to a brand-correct full-screen scene the instant we transition from `uploading` → `analyzing`:

- **Linen background**, no photo behind it — a clean phase change.
- **Pine bowl** centered (the icon's bowl, lifted out of `icon-master.svg`), static.
- **Saffron steam swirl** rising above the bowl, gently animated (subtle vertical translate + opacity breathe, looped). This is the brand swirl — the same shape used in the app icon and splash — brought to life.
- **Fraunces caption** below the composition, cross-fading through a time-based sequence:
  - `0–2.5s` → "Looking at your fridge…"
  - `2.5–5s` → "Sorting ingredients…" *(new — copywriter review required)*
  - `5–10s` → "Building 3 recipes for you…"
  - `>10s` → "Almost there…" *(new — copywriter review required)*

This is a Day 26 polish move. No new RN dependencies, no Lottie, no rewrites — one new component (~120 lines), two new pre-rendered PNGs from the existing icon pipeline, a small split in `camera.tsx`, and two new microcopy strings to lock.

## Current State

`app/app/(tabs)/camera.tsx` handles the camera flow with a `ScreenState` machine: `camera | preview | uploading | analyzing | error`.

Today's `analyzing` rendering (lines ~272–305) lives in a combined branch with `preview` and `uploading`. All three states render the captured photo full-screen with a `<SafeAreaView>` overlay at the bottom — either the Retake / Use-this-photo button row (for `preview`) or a small `<ActivityIndicator>` + label pill (for `uploading` and `analyzing`). The label is "Saving photo…" or "Looking at your fridge…".

Two things are off:

1. **Phase mismatch.** "Looking at your fridge…" is locked in `10-microcopy.md` as the *photo-capture* loading label, but today's code uses it for the *recipe-gen* phase. The locked recipe-gen label is "Building 3 recipes for you…" — currently unused.
2. **No phase change signal.** The user confirmed their photo, sees the photo + spinner, then sees the same photo + spinner again. There's no visual beat to indicate "we moved from saving the image to actually thinking."

Existing pieces to reuse:

- **Icon SVG masters** — `app/assets/icon-source/icon-master.svg` already contains both the Pine bowl path and the Saffron swirl path. We'll split these into two scoped SVG sources and pre-render to transparent PNG via the existing `tools/render-icons.mjs` pipeline (uses `sharp`, already a devDep, already in the repo).
- **Animated** — `app/components/Toast.tsx` is the in-repo reference for `Animated.timing` + `useNativeDriver: true`. No new animation library needed.
- **Microcopy library** — `knowledge/10-microcopy.md` is the authority on locked strings. Two new entries will land there once copywriter approves them.

## Proposed Changes

**New files:**
```
app/assets/icon-source/loading-bowl.svg          — Pine bowl path only, transparent canvas
app/assets/icon-source/loading-swirl.svg         — Saffron swirl path only, transparent canvas
app/assets/images/loading-bowl.png               — rendered output, 512×512, transparent
app/assets/images/loading-swirl.png              — rendered output, 512×512, transparent
app/components/RecipeLoading.tsx                 — full-screen branded scene
```

**Modified files:**
```
app/tools/render-icons.mjs                       — add two render() calls for the loading assets
app/app/(tabs)/camera.tsx                        — split render branch; analyzing → <RecipeLoading />
knowledge/10-microcopy.md                        — add "Sorting ingredients…" + "Almost there…" rows
notes/journal.md                                 — short entry for Day 26 polish
CLAUDE.md                                        — Build State "Last shipped" bump (one-liner)
```

**No dependency adds.** No `react-native-svg`, no Lottie, no Reanimated. Pure pre-rendered PNG + RN `Animated` with native driver.

## Design Decisions

### Pre-render SVG to PNG, don't render SVG at runtime

We don't currently use `react-native-svg`. Adding it for one screen is wrong for a Day 26 polish move — extra dep, extra bundle weight, extra config (Metro transformer if we wanted `*.svg` imports). The bowl + swirl are static art; we just need two transparent PNGs at 2× the on-screen size. The existing `sharp` pipeline produces these cleanly.

### Why two PNGs, not one composite

The brief calls for the swirl to animate independently of the bowl. One composite PNG would force us to animate the whole illustration as a unit; two layered PNGs let the bowl sit still while the swirl breathes — which is closer to the brand language ("subtle steam swirl on key moments").

### Animation: brand calm, not toy bouncy

Brand rule from `12-brand-identity.md`: *"Subtle steam swirl/shimmer on key moments. No bouncy springs. ~250ms ease-out for entries."*

The swirl gets a 1.6s in/out loop:
- `translateY`: 0 → -8px → 0 (rises gently, settles back)
- `opacity`: 0.85 → 1.0 → 0.85 (subtle breathe)

Both run as a single `Animated.loop` with `useNativeDriver: true`. Sequence + linear+ease easing, no springs. Total visual motion is a few pixels — felt rather than seen.

### Captions: time-driven, not setInterval-driven

A naïve `setInterval(advance, 2500)` would race with the actual Anthropic latency — a 1.8s scan would still show the first caption for 2.5s before the screen unmounts; a 12s scan would skip past "Almost there…" by lining up indices wrong.

Better: a single `requestAnimationFrame` driver (or 250ms tick) reads `Date.now() - startedAt` and picks the latest caption whose `minMs <= elapsed`. On transition we cross-fade via a 180ms `Animated.timing` on a separate opacity value. This means:

- Fast scans (≤2.5s) never see caption #2; we just unmount mid-fade. Fine.
- Slow scans (>10s) lock to "Almost there…" and stay there until results land.
- The transition between captions is one shared `<Animated.Text>` whose opacity fades to 0, then we swap `text` and fade to 1. Standard pattern.

### Reduce-motion respected

If `AccessibilityInfo.isReduceMotionEnabled()` returns true, we:
- Skip the swirl loop (render the swirl statically at opacity 1.0, no translate)
- Skip caption cross-fades (instant swap)
- Caption sequence still advances by time — reduce-motion is about animation, not informational change

Read once on mount; we don't need to subscribe to changes during a 5–15s scene.

### Accessibility

- Caption has `accessibilityLiveRegion="polite"` (Android) and `accessibilityRole="text"` + an `accessibilityLabel` that updates with each caption change. VoiceOver will announce caption changes.
- The bowl/swirl imagery is decorative — `accessibilityLabel="Cookable is preparing your recipes."` on the container so screen-reader users get one descriptive announcement, not a confusing image label.

### New microcopy needs copywriter review

Two new strings:

- "Sorting ingredients…"
- "Almost there…"

Both are on-voice at a glance — sentence case, no banned words, no exclamation, no AI references. But per the project rule, anything user-facing goes through `cookable-copywriter` before locking in `10-microcopy.md`. The `/implement` run will invoke the subagent with both strings and the surrounding context (recipe-gen loading sequence, ~5–15s wait), accept whatever it lands on, then add the chosen strings to the microcopy doc.

### Alternative considered: swirl only, no bowl

Dropping the bowl and showing just the Saffron swirl on Linen was tempting — less visual weight, cleaner focus on the caption. Rejected because the bowl + swirl is the brand mark; halving it loses the recognition. The user's brief also explicitly asks for both.

### Alternative considered: animate via Reanimated

Reanimated handles complex gesture-driven motion. We don't need that here — a single looped translate+opacity on one node. Stock RN `Animated` with the native driver is right-sized. No reason to pull in Reanimated v3 for this alone.

### Alternative considered: cycle captions via index-based interval

Discussed in *Captions: time-driven* above. Rejected — racy with actual scan latency.

## Open Questions

1. **Caption set for copywriter.** The plan locks "Looking at your fridge…" and "Building 3 recipes for you…" (already approved in `10-microcopy.md`). The middle and tail captions ("Sorting ingredients…", "Almost there…") need copywriter sign-off during `/implement`. If copywriter rewrites them, accept the rewrite and update both the component constants and `10-microcopy.md`.
2. **Whether to ever extend the analyzing state past 10s with a fallback message.** The Edge Function has retry-once-on-failure; total wall-time could reach 25–30s in the worst case. "Almost there…" is honest at 10s, awkward at 25s. *Recommendation:* ship with 10s as the final caption; if beta testers report "stuck" perception, add a 20s "Hang tight — fridge is being thoughtful." (also subject to copywriter). Don't pre-build the 20s state.
3. **Whether to add a subtle cancel affordance.** Today's flow has no way to cancel an in-flight scan — back button on Android exits the tab but the async invoke continues, and the next focus on Camera lands back in the viewfinder. Not in scope for this plan; flagging for the Week 4 retro. *Recommendation:* defer; "cancel during analyzing" has not surfaced as a beta-blocker and the wait is short enough that most users will just sit through it.

## Step-by-Step Tasks

### 1. Extract two SVG sources from the icon master

Create `app/assets/icon-source/loading-bowl.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- Loading scene: Pine bowl on transparent canvas. Paired with loading-swirl.svg
       so the swirl can animate independently in RN. -->
  <path d="M 222 560 C 222 560, 222 718, 414 740 C 470 746, 554 746, 610 740 C 802 718, 802 560, 802 560 A 290 38 0 0 1 222 560 Z" fill="#2D5F4E"/>
  <ellipse cx="512" cy="560" rx="278" ry="34" fill="#234E40"/>
</svg>
```

(Same bowl + inner ellipse paths as `icon-splash.svg` — mono-Pine, no swirl.)

Create `app/assets/icon-source/loading-swirl.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- Loading scene: Saffron swirl on transparent canvas. Positioned in the same
       1024×1024 coordinate space as loading-bowl.svg so the two compose 1:1
       when stacked in RN. -->
  <path d="M 512 500 C 380 440, 380 360, 512 320 C 644 280, 644 200, 512 160 C 432 130, 488 70, 512 40" fill="none" stroke="#E89B3C" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

(Exact swirl path from `icon-master.svg`, kept in the same 1024×1024 viewBox so stacking the two PNGs at identical container size aligns them pixel-perfect.)

### 2. Extend the icon renderer

Edit `app/tools/render-icons.mjs`. After the existing four `render()` calls, append:

```js
// 5. Loading-scene bowl — Pine, transparent canvas. Stacked with loading-swirl
//    in <RecipeLoading /> while a scan is being processed.
await render({ svg: src('loading-bowl.svg'), dest: out('loading-bowl.png'), size: 512 });

// 6. Loading-scene swirl — Saffron, transparent canvas. Animated above the bowl.
await render({ svg: src('loading-swirl.svg'), dest: out('loading-swirl.png'), size: 512 });
```

Run from `app/`:
```
node tools/render-icons.mjs
```

Verify the two new PNGs land in `app/assets/images/` and are visually correct (open in Preview / Photos): bowl is a Pine silhouette with a darker inner ellipse, swirl is a Saffron stroke alone.

### 3. Build `app/components/RecipeLoading.tsx`

Structure (~120 lines):

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { AppColors } from '@/constants/Colors'

type Caption = { text: string; minMs: number }

const CAPTIONS: Caption[] = [
  { text: 'Looking at your fridge…', minMs: 0 },
  { text: 'Sorting ingredients…', minMs: 2500 },
  { text: 'Building 3 recipes for you…', minMs: 5000 },
  { text: 'Almost there…', minMs: 10000 },
]

function captionFor(elapsedMs: number): string {
  let active = CAPTIONS[0].text
  for (const c of CAPTIONS) {
    if (elapsedMs >= c.minMs) active = c.text
  }
  return active
}

export function RecipeLoading() {
  const swirlY = useRef(new Animated.Value(0)).current
  const swirlOpacity = useRef(new Animated.Value(0.85)).current
  const captionOpacity = useRef(new Animated.Value(1)).current

  const [caption, setCaption] = useState(CAPTIONS[0].text)
  const [reduceMotion, setReduceMotion] = useState(false)
  const startedAtRef = useRef(Date.now())

  // Reduce motion read once on mount.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {})
  }, [])

  // Swirl loop — subtle rise + opacity breathe. Skipped under reduce motion.
  useEffect(() => {
    if (reduceMotion) return
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(swirlY, {
            toValue: -8,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(swirlY, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(swirlOpacity, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(swirlOpacity, {
            toValue: 0.85,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [reduceMotion, swirlY, swirlOpacity])

  // Caption tick — 250ms is fine, we're driven by elapsed time, not the tick rate.
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const next = captionFor(elapsed)
      setCaption((curr) => {
        if (curr === next) return curr
        if (reduceMotion) return next // instant swap under reduce motion
        // Cross-fade: fade out, swap, fade in.
        Animated.sequence([
          Animated.timing(captionOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCaption(next)
          Animated.timing(captionOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }).start()
        })
        return curr
      })
    }, 250)
    return () => clearInterval(tick)
  }, [reduceMotion, captionOpacity])

  return (
    <View
      style={styles.container}
      accessibilityLabel="Cookable is preparing your recipes."
    >
      <View style={styles.illustration}>
        <Image
          source={require('@/assets/images/loading-bowl.png')}
          style={styles.bowl}
          resizeMode="contain"
        />
        <Animated.Image
          source={require('@/assets/images/loading-swirl.png')}
          style={[
            styles.swirl,
            {
              opacity: swirlOpacity,
              transform: [{ translateY: swirlY }],
            },
          ]}
          resizeMode="contain"
        />
      </View>
      <Animated.Text
        style={[styles.caption, { opacity: captionOpacity }]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={caption}
      >
        {caption}
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background, // Linen
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bowl: {
    position: 'absolute',
    width: 220,
    height: 220,
  },
  swirl: {
    position: 'absolute',
    width: 220,
    height: 220,
  },
  caption: {
    marginTop: 40,
    fontFamily: 'Fraunces_400Regular',
    fontSize: 22,
    lineHeight: 28,
    color: AppColors.text,
    textAlign: 'center',
  },
})
```

Notes for the implementer:

- Caption font is Fraunces 22pt — meets brand rule "Fraunces only at 22pt+".
- The illustration container is 220×220; both images are stacked absolutely inside it so the swirl translates relative to the bowl.
- `AppColors.background` resolves to Linen `#FAF7F2` (verify in `constants/Colors.ts`).
- The caption setState pattern looks weird but is correct — `setCaption` is called inside the Animated.sequence callback so the text only changes once the fade-out completes; we return `curr` from the setter to skip the immediate render.

### 4. Run new captions through `cookable-copywriter`

Invoke the `cookable-copywriter` subagent with this prompt:

> Two new microcopy strings for the recipe-loading scene that plays during the 5–15s wait while Claude analyzes a fridge photo and writes 3 recipes. They sit between two already-locked strings: "Looking at your fridge…" (first ~2.5s) and "Building 3 recipes for you…" (~5–10s).
>
> Slot 2 (current draft): "Sorting ingredients…" — appears 2.5–5s in, after the AI has finished initial detection and is structuring the input.
>
> Slot 4 (current draft): "Almost there…" — appears after 10s for slow scans, replacing the prior caption until results land.
>
> Voice rules apply: sentence case, no exclamation, no banned words ("amazing/delicious/yummy/scrumptious"), no "powered by AI". The whole sequence should read as one thought, not four random lines. Approve or rewrite each.

Accept the agent's output. Update:
- The `CAPTIONS` array in `RecipeLoading.tsx` with the final strings.
- `knowledge/10-microcopy.md` — add two rows under the existing "Loading recipes" entry, marking the slot (e.g., "Recipe loading caption — slot 2" / "Recipe loading caption — slot 4 (>10s)").

### 5. Wire `<RecipeLoading />` into `camera.tsx`

Edit `app/app/(tabs)/camera.tsx`.

**Imports** — add:

```ts
import { RecipeLoading } from '@/components/RecipeLoading'
```

**Render branch split** — find the existing block (around lines 272–305):

```tsx
if (state === 'preview' || state === 'uploading' || state === 'analyzing') {
  const overlayLabel =
    state === 'uploading'
      ? 'Saving photo…'
      : state === 'analyzing'
        ? 'Looking at your fridge…'
        : null
  ...
}
```

Replace with:

```tsx
// ── Analyzing — branded full-screen scene ──────────────────────────────────

if (state === 'analyzing') {
  return <RecipeLoading />
}

// ── Preview / uploading — photo with overlay ───────────────────────────────

if (state === 'preview' || state === 'uploading') {
  const overlayLabel = state === 'uploading' ? 'Saving photo…' : null
  // ... (unchanged below)
}
```

The rest of the block (the `<Image>` + `<SafeAreaView>` + buttons / spinner) stays exactly as-is — we're just lifting `analyzing` out and dropping the `analyzing` case from `overlayLabel`.

### 6. Microcopy doc update

Edit `knowledge/10-microcopy.md`. After the existing "Loading recipes" row, insert (final wording after step 4 lands):

```md
| Recipe loading caption — slot 2 (~2.5–5s) | <final from copywriter> |
| Recipe loading caption — slot 4 (>10s) | <final from copywriter> |
```

Also confirm: the existing "Loading after photo capture" row stays mapped to "Looking at your fridge…", and "Loading recipes" stays mapped to "Building 3 recipes for you…". Both remain in active use as captions slots 1 and 3.

### 7. Journal + CLAUDE.md

Append a short entry to `notes/journal.md`:

```md
## 2026-05-13 — Recipe loading scene

Replaced the photo + bottom spinner overlay with a full-screen branded loading scene during the `analyzing` phase. Linen bg, Pine bowl, Saffron swirl on a subtle 1.6s breathe loop, Fraunces caption cycling through four time-based slots ("Looking…" → "Sorting…" → "Building…" → "Almost there…"). Uploading phase still shows photo + overlay — only the AI-wait phase moved to the branded scene. New PNG assets rendered from two new SVG sources via the existing icon pipeline; no new RN deps.
```

Update `CLAUDE.md` Build State **Last shipped** line to mention the loading scene (one sentence).

### 8. TypeScript + lint

From `app/`:
```
npm run typecheck
```

App code must be clean. Expected pre-existing failures in `supabase/functions/` (Deno files under RN tsconfig) remain — unchanged by this plan.

## Testing Plan

### Device matrix
- iOS simulator (latest), Android emulator (Pixel API 34). Real-device pass during Day 28 beta covers the rest.

### Functional
1. **Cold start, fresh scan.** Open Camera, capture a photo, tap Use this photo. Observe:
   - Brief "Saving photo…" overlay on the photo (1–2s).
   - Hard cut to Linen scene with bowl + swirl + first caption.
   - Caption advances to slot 2 around the 2.5s mark.
   - Caption advances to slot 3 around the 5s mark.
   - When results land, the scene unmounts and `/scan/[id]` opens.
2. **Slow scan path (manually delay Anthropic).** Temporarily add a `await new Promise(r => setTimeout(r, 12000))` at the top of `generate-recipes/index.ts` (revert before commit). Verify slot 4 ("Almost there…") appears at ~10s and stays until results land.
3. **Fast scan path (cache hit).** Re-scan an already-cached image (same scan_id won't trigger; instead, run the same photo within the 10-min cache window). Verify the loading scene shows at all — even cached responses go through `analyzing` briefly. No crashes if the scene unmounts before slot 2 fires.
4. **Anonymous onboarding scan.** Run the onboarding flow's first-scan path (anonymous user, `source=onboarding`). Verify the loading scene renders identically; the onboarding `source` param flow is unaffected.
5. **Error path.** Force a network failure (airplane mode after upload but before analyze). The retry-once loop should still navigate to results with `fallback=1`; the loading scene shows during both attempts and unmounts on navigation.

### Brand + accessibility
6. **Reduce motion ON.** iOS Settings → Accessibility → Motion → Reduce Motion → ON. Re-run a scan. Verify:
   - Swirl is static (no breathing).
   - Caption swaps instantly (no fade).
   - Caption text still advances by time.
7. **VoiceOver / TalkBack.** Enable screen reader. Verify the container announces "Cookable is preparing your recipes." once, and caption changes are announced as the live region updates.
8. **Visual brand check.** Linen bg, Pine bowl rendering at correct alpha (no white halo), Saffron swirl is the brand orange, Fraunces caption — not the system font.

### TypeScript
9. `npm run typecheck` clean for all RN app code.

## Validation Checklist

- [ ] Two new SVG sources committed in `app/assets/icon-source/`
- [ ] `tools/render-icons.mjs` extended with two new render calls
- [ ] `node tools/render-icons.mjs` produces `loading-bowl.png` + `loading-swirl.png` with correct transparency
- [ ] `app/components/RecipeLoading.tsx` created — bowl + swirl composition, swirl loop, time-driven caption cycling, reduce-motion respect, accessibility live region
- [ ] `camera.tsx` analyzing branch lifted into `<RecipeLoading />`; preview/uploading branch retained with `'analyzing'` dropped from `overlayLabel`
- [ ] `cookable-copywriter` invoked for slots 2 and 4; chosen copy applied in both component and `10-microcopy.md`
- [ ] `10-microcopy.md` has two new rows for the new caption slots
- [ ] `notes/journal.md` has the 2026-05-13 entry
- [ ] `CLAUDE.md` Build State "Last shipped" mentions the loading scene
- [ ] `npm run typecheck` clean for app code
- [ ] Brand voice rules followed (sentence case, no banned words, no exclamation, no AI references)
- [ ] iOS + Android emulator pass for the five functional test cases
- [ ] Reduce-motion + VoiceOver pass

## Implementation Notes

### 2026-05-13 — Implemented

**What was done:**
All seven plan steps executed as written.

1. Created `app/assets/icon-source/loading-bowl.svg` and `loading-swirl.svg` — Pine bowl and Saffron swirl extracted from the icon master into separate 1024×1024 SVG files on transparent canvases.
2. Extended `app/tools/render-icons.mjs` with two new `render()` calls. Ran the renderer — `loading-bowl.png` (5.6 KB) and `loading-swirl.png` (5.6 KB) landed in `app/assets/images/`.
3. Invoked `cookable-copywriter` for caption slots 2 and 4. Both rewrites accepted:
   - Slot 2: "Spotting what you've got…" (draft: "Sorting ingredients…" — agent noted "sorting" was clinical and dropped "you" from the copy)
   - Slot 4: "Finishing up your recipes…" (draft: "Almost there…" — agent correctly flagged it as the most overused mobile loading cliché, no new information)
4. Built `app/components/RecipeLoading.tsx` — full implementation with swirl loop, time-driven caption cycling, reduce-motion guard, and accessibility live region.
5. Wired into `app/app/(tabs)/camera.tsx` — `analyzing` state now renders `<RecipeLoading />` as an early-return before the photo+overlay branch; `uploading` keeps "Saving photo…" on the photo.
6. Added two new rows to `knowledge/10-microcopy.md` for slots 2 and 4.
7. Updated `notes/journal.md` and `CLAUDE.md` Build State.

**Deviations from plan:**
- One minor: the curly apostrophe (U+2019) in "you've" from the copywriter's output caused a TypeScript parse error when the string used single-quote delimiters. Fixed by switching that string to double-quote delimiters (`"Spotting what you've got…"`). The rendered text in the app is identical.
- Otherwise: no deviations. All steps executed exactly as specified.

**TypeScript:** Clean for all RN app code. Pre-existing Deno errors in `supabase/functions/` unchanged and expected.

---

## Success Criteria

After this lands, a user who taps "Use this photo" sees:

1. ≤ 2s of "Saving photo…" overlay on their photo.
2. A clean hard cut to a Linen scene with the Pine bowl + Saffron swirl breathing gently above it, with a Fraunces caption that meaningfully progresses through the wait.
3. ≤ 10s later (in the typical case), the scene unmounts and recipe results render.

The loading wait stops feeling like a stalled upload and starts feeling like the brand at work. Beta testers in Day 28 do not flag "the loading screen looks broken" or "I thought it was stuck" — a baseline confirmation that the polish achieved what the photo-with-overlay couldn't.
