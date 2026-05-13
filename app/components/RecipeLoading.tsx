import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native'
import { AppColors } from '@/constants/Colors'

// ── Caption sequence ─────────────────────────────────────────────────────────
//
// Driven by elapsed time (Date.now() - startedAt), not a naïve index counter,
// so actual Anthropic latency can't desync what the user reads vs. what's
// actually happening.
//
// Slots 1 and 3 are locked in knowledge/10-microcopy.md.
// Slots 2 and 4 were reviewed and approved by cookable-copywriter 2026-05-13.

type Caption = { text: string; minMs: number }

const CAPTIONS: Caption[] = [
  { text: 'Looking at your fridge…',   minMs: 0 },
  { text: "Spotting what you've got…", minMs: 2500 },
  { text: 'Building 3 recipes for you…', minMs: 5000 },
  { text: 'Finishing up your recipes…', minMs: 10000 },
]

function captionFor(elapsedMs: number): string {
  let active = CAPTIONS[0].text
  for (const c of CAPTIONS) {
    if (elapsedMs >= c.minMs) active = c.text
  }
  return active
}

// ── Component ────────────────────────────────────────────────────────────────

export function RecipeLoading() {
  // Animated values for the swirl (breathe loop).
  const swirlY       = useRef(new Animated.Value(0)).current
  const swirlOpacity = useRef(new Animated.Value(0.85)).current

  // Animated value for caption cross-fade.
  const captionOpacity = useRef(new Animated.Value(1)).current

  const [caption, setCaption]       = useState(CAPTIONS[0].text)
  const [reduceMotion, setReduceMotion] = useState(false)
  const startedAtRef = useRef(Date.now())

  // Read reduce-motion preference once on mount — no need to subscribe during
  // a 5–15s scene.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {})
  }, [])

  // Swirl loop: gentle vertical rise + opacity breathe, 1.6s per half-cycle.
  // Brand rule: "Subtle steam swirl/shimmer on key moments. No bouncy springs."
  useEffect(() => {
    if (reduceMotion) return

    const loop = Animated.loop(
      Animated.parallel([
        // Rise and settle.
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
        // Opacity breathe.
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

  // Caption tick: 250ms is a comfortable resolution given 2.5s slot intervals.
  // Captions cross-fade (180ms) rather than instant-swap — reduce motion skips
  // the animation and swaps immediately.
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const next = captionFor(elapsed)

      setCaption((curr) => {
        if (curr === next) return curr

        if (reduceMotion) {
          // Instant swap — no animation.
          return next
        }

        // Fade out → swap text → fade in.
        Animated.timing(captionOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          setCaption(next)
          Animated.timing(captionOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }).start()
        })

        // Return curr for this render — the real swap happens in the callback.
        return curr
      })
    }, 250)

    return () => clearInterval(tick)
  }, [reduceMotion, captionOpacity])

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Cookable is preparing your recipes."
    >
      {/* Bowl + swirl are in the same 1024×1024 coordinate space so they
          stack pixel-perfectly at any square container size. */}
      <View style={styles.illustration}>
        <Image
          source={require('@/assets/images/loading-bowl.png')}
          style={styles.layer}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Animated.Image
          source={require('@/assets/images/loading-swirl.png')}
          style={[
            styles.layer,
            {
              opacity: swirlOpacity,
              transform: [{ translateY: swirlY }],
            },
          ]}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>

      {/* Caption — Fraunces 22pt per brand scale. Live region announces
          changes to VoiceOver / TalkBack without re-reading the whole screen. */}
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
    backgroundColor: AppColors.background, // Linen #FAF7F2
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    // Fixed square container; both images are absolutely positioned inside
    // so the swirl translateY offsets relative to its resting position.
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    width: 220,
    height: 220,
  },
  caption: {
    marginTop: 40,
    fontFamily: 'Fraunces_400Regular', // 400 is the lighter, warmer weight for body Fraunces
    fontSize: 22,                      // meets "Fraunces only at 22pt+" brand rule
    lineHeight: 28,
    color: AppColors.text,
    textAlign: 'center',
  },
})
