import { useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import Purchases, { CustomerInfo, PurchasesOfferings } from 'react-native-purchases'
import { supabase } from '@/lib/supabase'
import { initPurchases, getOfferings } from '@/lib/purchases'

export type SubscriptionTier = 'free' | 'plus' | 'pro'

export type SubscriptionState = {
  tier: SubscriptionTier
  isPlus: boolean
  customerInfo: CustomerInfo | null
  offerings: PurchasesOfferings | null
  isLoading: boolean
}

export function tierFromCustomerInfo(info: CustomerInfo): SubscriptionTier {
  if (info.entitlements.active['cookable_plus']) return 'plus'
  return 'free'
}

function writeSubscriptionToDb(userId: string, info: CustomerInfo): void {
  const ent = info.entitlements.active['cookable_plus']
  const tier: SubscriptionTier = ent ? 'plus' : 'free'
  const status = ent
    ? ent.periodType === 'TRIAL'
      ? 'trialing'
      : 'active'
    : 'inactive'
  const expiresAt = ent?.expirationDate ?? null
  const trialEndsAt = status === 'trialing' ? expiresAt : null

  void supabase
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: status,
      subscription_expires_at: expiresAt,
      trial_ends_at: trialEndsAt,
    })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.warn('useSubscription: DB write failed:', error.message)
    })
}

export function useSubscription(
  userId: string | null,
  seedTier?: SubscriptionTier,
): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    tier: seedTier ?? 'free',
    isPlus: seedTier === 'plus',
    customerInfo: null,
    offerings: null,
    isLoading: true,
  })
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => {
    if (!userId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    // Capture as non-null — we're past the null guard above.
    const uid = userId
    let cancelled = false

    async function init() {
      initPurchases(uid)
      const [offeringsResult, infoResult] = await Promise.allSettled([
        getOfferings(),
        Purchases.getCustomerInfo(),
      ])
      if (cancelled) return

      const offerings =
        offeringsResult.status === 'fulfilled' ? offeringsResult.value : null
      const customerInfo =
        infoResult.status === 'fulfilled' ? infoResult.value : null
      const tier = customerInfo ? tierFromCustomerInfo(customerInfo) : (seedTier ?? 'free')

      setState({
        tier,
        isPlus: tier === 'plus',
        customerInfo,
        offerings,
        isLoading: false,
      })
    }

    void init()

    function onCustomerInfoUpdate(info: CustomerInfo) {
      if (cancelled) return
      const tier = tierFromCustomerInfo(info)
      setState((s) => ({ ...s, tier, isPlus: tier === 'plus', customerInfo: info }))
      writeSubscriptionToDb(uid, info)
    }

    Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdate)

    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        void Purchases.getCustomerInfo()
          .then((info) => {
            if (cancelled) return
            const tier = tierFromCustomerInfo(info)
            setState((s) => ({ ...s, tier, isPlus: tier === 'plus', customerInfo: info }))
          })
          .catch(() => {})
      }
      appStateRef.current = next
    })

    return () => {
      cancelled = true
      Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdate)
      appStateSub.remove()
    }
  }, [userId])

  return state
}
