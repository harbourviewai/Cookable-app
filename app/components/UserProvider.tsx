import React, { createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import type { CustomerInfo, PurchasesOfferings } from 'react-native-purchases'
import { useUser, type UserProfile } from '@/hooks/useUser'
import { useSubscription, type SubscriptionTier } from '@/hooks/useSubscription'

export type UserContextValue = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  tier: SubscriptionTier
  isPlus: boolean
  customerInfo: CustomerInfo | null
  offerings: PurchasesOfferings | null
  subscriptionLoading: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const userState = useUser()

  // Seed tier from the DB-cached value while RC initialises.
  // Prevents a brief free-tier flash for Plus users on cold start.
  const seedTier = (userState.profile?.subscription_tier ?? 'free') as SubscriptionTier
  const subscription = useSubscription(userState.user?.id ?? null, seedTier)

  // The DB column is webhook-synced and authoritative. RC is a faster
  // real-time signal for fresh purchases (entitlement appears in the SDK
  // before the webhook fires). Take the upgraded tier from either source
  // so manual DB flips for testing and pre-webhook purchases both work.
  const effectiveTier: SubscriptionTier =
    seedTier === 'plus' || subscription.tier === 'plus' ? 'plus' : 'free'

  const value: UserContextValue = {
    ...userState,
    tier: effectiveTier,
    isPlus: effectiveTier === 'plus',
    customerInfo: subscription.customerInfo,
    offerings: subscription.offerings,
    subscriptionLoading: subscription.isLoading,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUserContext(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUserContext must be used within UserProvider')
  return ctx
}
