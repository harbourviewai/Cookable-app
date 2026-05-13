import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { Platform } from 'react-native'

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ?? ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? ''

let configured = false

export function initPurchases(userId: string | null): void {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
  if (!apiKey) {
    console.warn(`RevenueCat: no API key for ${Platform.OS} — purchases disabled`)
    return
  }
  if (!configured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR)
    Purchases.configure({ apiKey })
    configured = true
  }
  if (userId) {
    Purchases.logIn(userId).catch((err) => {
      console.warn('RevenueCat logIn failed:', err)
    })
  }
}

export async function getOfferings() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await Promise.race([
        Purchases.getOfferings(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ])
    } catch (err) {
      if (attempt === 1) {
        console.warn('RevenueCat getOfferings failed:', err)
        return null
      }
    }
  }
  return null
}
