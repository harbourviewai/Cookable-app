import { StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { completeOnboardingForUser } from '@/lib/onboarding'
import { useUserContext } from '@/components/UserProvider'

const benefits = ['Unlimited scans', 'No ads', 'Save unlimited', 'Dietary filters']

export default function SoftPaywallScreen() {
  const router = useRouter()
  const { user } = useUserContext()

  async function continueFree() {
    await completeOnboardingForUser(user?.id)
    // Just close this modal - scan results are underneath
    router.back()
  }

  async function tryPlus() {
    await completeOnboardingForUser(user?.id)
    // Replace this modal with paywall modal - scan results stay underneath
    router.replace('/paywall?source=onboarding' as any)
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={continueFree}>
        <View style={styles.scrim} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <Text style={styles.headline}>You're all set.</Text>
        <Text style={styles.subhead}>You've got 3 free scans this week. Want unlimited?</Text>
        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={AppColors.primary} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={tryPlus}>
          <Text style={styles.primaryButtonText}>Try Plus Free 7 Days</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={continueFree}>
          <Text style={styles.secondaryButtonText}>Continue with free</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  headline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 30,
    color: AppColors.text,
    textAlign: 'center',
  },
  subhead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 23,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  benefits: {
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.text,
  },
  primaryButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.textMuted,
  },
})
