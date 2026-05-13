import { Text, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { OnboardingFrame } from '@/components/OnboardingFrame'
import { AppColors } from '@/constants/Colors'
import { markOnboardingComplete } from '@/lib/onboarding'

export default function WelcomeScreen() {
  const router = useRouter()

  async function handleSignIn() {
    await markOnboardingComplete()
    router.replace('/auth/sign-in')
  }

  return (
    <OnboardingFrame
      headline="Cook anything. Waste nothing."
      subhead="Snap your fridge — we'll show you what you can cook tonight."
      primaryLabel="Get Started"
      onPrimaryPress={() => router.push('/onboarding/how-it-works' as any)}
      secondaryLabel="Already have an account? Sign in"
      onSecondaryPress={handleSignIn}
    >
      <View style={styles.logoMark}>
        <Text style={styles.logoText}>Cookable</Text>
      </View>
    </OnboardingFrame>
  )
}

const styles = StyleSheet.create({
  logoMark: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.primary,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  logoText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
    color: AppColors.background,
  },
})
