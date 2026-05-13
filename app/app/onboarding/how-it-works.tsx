import { Text, View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { OnboardingFrame } from '@/components/OnboardingFrame'
import { AppColors } from '@/constants/Colors'

const steps = [
  { icon: 'camera-outline' as const, title: 'Snap your fridge or pantry' },
  { icon: 'sparkles-outline' as const, title: "We'll spot every ingredient — even what's about to go bad" },
  { icon: 'restaurant-outline' as const, title: 'Get 3 recipes you can cook right now' },
]

export default function HowItWorksScreen() {
  const router = useRouter()

  return (
    <OnboardingFrame
      headline="Here's how it works"
      primaryLabel="Continue"
      onPrimaryPress={() => router.push('/onboarding/skill' as any)}
    >
      <View style={styles.steps}>
        {steps.map((step) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={24} color={AppColors.primary} />
            </View>
            <Text style={styles.stepText}>{step.title}</Text>
          </View>
        ))}
      </View>
    </OnboardingFrame>
  )
}

const styles = StyleSheet.create({
  steps: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF6F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 22,
    color: AppColors.text,
  },
})
