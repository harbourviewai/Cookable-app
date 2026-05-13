import { Stack } from 'expo-router'
import { AppColors } from '@/constants/Colors'

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AppColors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="how-it-works" />
      <Stack.Screen name="skill" />
      <Stack.Screen name="cuisine" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="first-scan" />
      <Stack.Screen name="auth-gate" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="soft-paywall" options={{ presentation: 'transparentModal' }} />
    </Stack>
  )
}
