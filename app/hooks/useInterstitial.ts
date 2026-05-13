// useInterstitial — preloads an AdMob interstitial on mount and exposes a
// gated show() the scan results screen calls on exit (recipe tap or back).
//
// Gating, evaluated at show() time:
//   1. Free tier only.
//   2. The ad must be loaded (no blocking the user on a cold ad request).
//   3. At least 4 minutes since the last shown ad in this app session
//      (in-memory ref — survives across screens but not app cold start).
//   4. scan_count_lifetime % 2 === 0 AND > 0 (fires on scan #2, #4, #6, …).
//
// On a real show, increments users.interstitials_shown_count and reloads the
// next ad in the background. show() resolves once the ad is dismissed (or
// immediately if gated out / not loaded), so callers can race it against a
// short timeout to avoid blocking navigation on a slow ad.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AdEventType,
  InterstitialAd,
} from 'react-native-google-mobile-ads'
import { getInterstitialUnitId, nonPersonalizedAdRequest } from '@/lib/ads'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/hooks/useUser'

const FOUR_MINUTES_MS = 4 * 60 * 1_000

let lastShownAt = 0

export function useInterstitial() {
  const { user, profile } = useUser()
  const adRef = useRef<InterstitialAd | null>(null)
  const [loaded, setLoaded] = useState(false)
  const resolveCloseRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(
      getInterstitialUnitId(),
      nonPersonalizedAdRequest,
    )
    adRef.current = ad

    const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setLoaded(true)
    })
    const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setLoaded(false)
      // Resolve any pending show() promise so the caller can navigate.
      resolveCloseRef.current?.()
      resolveCloseRef.current = null
      // Preload the next interstitial so it's ready by the next eligible scan.
      try {
        ad.load()
      } catch (err) {
        if (__DEV__) console.warn('[ads] interstitial reload failed:', err)
      }
    })
    const offError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
      if (__DEV__) console.log('[ads] interstitial error:', err?.message)
      setLoaded(false)
      resolveCloseRef.current?.()
      resolveCloseRef.current = null
    })

    try {
      ad.load()
    } catch (err) {
      if (__DEV__) console.warn('[ads] interstitial initial load failed:', err)
    }

    return () => {
      offLoaded()
      offClosed()
      offError()
      adRef.current = null
    }
  }, [])

  const show = useCallback(async (): Promise<void> => {
    const ad = adRef.current
    if (!ad || !loaded) return
    if (profile?.subscription_tier !== 'free') return
    if (!user?.id) return

    // Pull the latest lifetime count — useUser doesn't track it, and the Edge
    // Function may have just incremented it on the most recent scan. Pull the
    // interstitial counter at the same time so the post-show bump is one round-trip.
    const { data, error } = await supabase
      .from('users')
      .select('scan_count_lifetime, interstitials_shown_count')
      .eq('id', user.id)
      .single()
    if (error || !data) return
    const count = data.scan_count_lifetime ?? 0
    const shownCount = data.interstitials_shown_count ?? 0
    if (count <= 0 || count % 2 !== 0) return

    const nowMs = Date.now()
    if (nowMs - lastShownAt < FOUR_MINUTES_MS) return

    // Wait for the CLOSED event before resolving so the caller can navigate
    // after the user dismisses. If the user backgrounds the app or anything
    // else throws, the listeners above resolve us anyway.
    const closed = new Promise<void>((resolve) => {
      resolveCloseRef.current = resolve
    })

    try {
      ad.show()
      lastShownAt = nowMs
      // Best-effort counter bump; failure shouldn't block the UX.
      void supabase
        .from('users')
        .update({ interstitials_shown_count: shownCount + 1 })
        .eq('id', user.id)
        .then(({ error: bumpErr }) => {
          if (bumpErr && __DEV__) {
            console.warn('[ads] interstitials_shown_count bump failed:', bumpErr.message)
          }
        })
    } catch (err) {
      if (__DEV__) console.warn('[ads] interstitial show failed:', err)
      resolveCloseRef.current?.()
      resolveCloseRef.current = null
      return
    }

    await closed
  }, [loaded, profile?.subscription_tier, user?.id])

  return { show }
}
