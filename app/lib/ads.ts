// AdMob init + unit-ID resolver.
//
// Test IDs come from Google's universal test pool (always safe, never invalidate
// real ad units). Production IDs come from EXPO_PUBLIC_ADMOB_* env vars set in
// .env.local / EAS build env. Development always uses test IDs regardless of env
// vars to prevent accidental clicks on prod units (which Google penalizes).
//
// Non-personalized mode is set on every request — this is the conservative path
// that avoids the iOS App Tracking Transparency prompt (deliberate scope choice
// per knowledge/05-tech-stack.md).

import { Platform } from 'react-native'
import mobileAds, {
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads'

export const nonPersonalizedAdRequest = {
  requestNonPersonalizedAdsOnly: true,
}

function envBannerId(): string | undefined {
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS
    : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID
}

function envInterstitialId(): string | undefined {
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS
    : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID
}

export function getBannerUnitId(): string {
  if (__DEV__) return TestIds.ADAPTIVE_BANNER
  return envBannerId() ?? TestIds.ADAPTIVE_BANNER
}

export function getInterstitialUnitId(): string {
  if (__DEV__) return TestIds.INTERSTITIAL
  return envInterstitialId() ?? TestIds.INTERSTITIAL
}

let initialized = false

export async function initializeAds(): Promise<void> {
  if (initialized) return
  initialized = true
  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    })
    await mobileAds().initialize()
  } catch (err) {
    initialized = false
    console.warn('initializeAds failed:', err)
  }
}
