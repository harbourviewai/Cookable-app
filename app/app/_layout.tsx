import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { Fraunces_400Regular, Fraunces_700Bold } from '@expo-google-fonts/fraunces'
import { UserProvider, useUserContext } from '@/components/UserProvider'
import { initializeAds } from '@/lib/ads'
import {
  hasCompletedOnboarding,
  hasStartedOnboardingScan,
  markOnboardingComplete,
} from '@/lib/onboarding'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Fraunces_400Regular,
    Fraunces_700Bold,
  })

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    void initializeAds()
  }, [])

  // UserProvider must mount unconditionally so any screen Expo Router renders
  // during font loading has a valid context. The font/auth guard lives in
  // RootNavigator, which renders null until both are ready.
  return (
    <UserProvider>
      <RootNavigator fontsLoaded={fontsLoaded} />
    </UserProvider>
  )
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, profile, loading } = useUserContext()
  const router = useRouter()
  const segments = useSegments() as string[]
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [onboardingScanStarted, setOnboardingScanStarted] = useState<boolean | null>(null)

  useEffect(() => {
    Promise.all([hasCompletedOnboarding(), hasStartedOnboardingScan()])
      .then(([complete, scanStarted]) => {
        setOnboardingComplete(complete)
        setOnboardingScanStarted(scanStarted)
      })
      .catch(() => {
        setOnboardingComplete(false)
        setOnboardingScanStarted(false)
      })
  }, [])

  useEffect(() => {
    if (!fontsLoaded || loading || onboardingComplete === null || onboardingScanStarted === null) return
    SplashScreen.hideAsync()

    const inAuthGroup = segments[0] === 'auth'
    const inOnboardingGroup = segments[0] === 'onboarding'
    const inTabsGroup = segments[0] === '(tabs)'
    const inPaywall = segments[0] === 'paywall'
    const inScanGroup = segments[0] === 'scan'
    const dbOnboardingComplete = Boolean(profile?.onboarding_completed_at)
    const complete = onboardingComplete || dbOnboardingComplete
    // Anonymous users can access camera/scan during onboarding flow
    const isAnonymous = user?.is_anonymous === true
    // Allow anonymous users in tabs/scan to complete onboarding without redirect
    const isOnboardingScanRoute = inTabsGroup || inScanGroup
    const isAnonymousInFlow = isAnonymous && isOnboardingScanRoute
    const isPendingAnonymousScan = onboardingScanStarted && isOnboardingScanRoute

    if (dbOnboardingComplete && !onboardingComplete) {
      void markOnboardingComplete().then(() => setOnboardingComplete(true))
    }

    if (!user && !complete && !inOnboardingGroup && !isPendingAnonymousScan) {
      router.replace('/onboarding/welcome' as any)
    } else if (!user && complete && !inAuthGroup) {
      router.replace('/auth/sign-in')
    } else if (user && !complete && !inOnboardingGroup && !isAnonymousInFlow) {
      // Anonymous users can use camera/scan during onboarding flow
      router.replace('/onboarding/welcome' as any)
    } else if (user && complete && (inAuthGroup || inOnboardingGroup) && !inPaywall) {
      // Allow paywall access after onboarding (soft paywall CTA)
      router.replace('/(tabs)')
    }
  }, [user, profile?.onboarding_completed_at, loading, fontsLoaded, segments, onboardingComplete, onboardingScanStarted, router])

  if (!fontsLoaded || loading || onboardingComplete === null || onboardingScanStarted === null) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth/sign-in" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="saved" />
      <Stack.Screen
        name="paywall"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  )
}
