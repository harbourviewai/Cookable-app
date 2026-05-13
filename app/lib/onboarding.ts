import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

const ONBOARDING_COMPLETED_KEY = 'cookable_onboarding_completed'
const ONBOARDING_STATE_KEY = 'cookable_onboarding_state'
const ONBOARDING_SCAN_STARTED_KEY = 'cookable_onboarding_scan_started'

export type OnboardingState = {
  skillLevel?: 'beginner' | 'intermediate' | 'confident'
  cuisines?: string[]
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)
  return value === 'true'
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
  await AsyncStorage.removeItem(ONBOARDING_SCAN_STARTED_KEY)
}

export async function hasStartedOnboardingScan(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_SCAN_STARTED_KEY)
  return value === 'true'
}

export async function markOnboardingScanStarted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SCAN_STARTED_KEY, 'true')
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const raw = await AsyncStorage.getItem(ONBOARDING_STATE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as OnboardingState
  } catch {
    return {}
  }
}

export async function updateOnboardingState(next: OnboardingState): Promise<OnboardingState> {
  const current = await getOnboardingState()
  const merged = { ...current, ...next }
  await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(merged))
  return merged
}

export async function persistOnboardingAnswers(userId: string): Promise<void> {
  const state = await getOnboardingState()
  await supabase
    .from('users')
    .update({
      skill_level: state.skillLevel ?? null,
      preferred_cuisines: state.cuisines ?? [],
    })
    .eq('id', userId)
}

export async function completeOnboardingForUser(userId?: string): Promise<void> {
  if (userId) {
    await supabase
      .from('users')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', userId)
  }
  await markOnboardingComplete()
}
