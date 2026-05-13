import { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases'
import { AppColors } from '@/constants/Colors'
import { useUserContext } from '@/components/UserProvider'
import { Toast } from '@/components/Toast'
import { TERMS_URL, PRIVACY_URL } from '@/lib/links'

type PaywallSource =
  | 'hard_wall'
  | 'save_limit'
  | 'dietary'
  | 'soft_prompt'
  | 'pantry'
  | 'grocery'

type ToastState = {
  visible: boolean
  message: string
  tone: 'success' | 'error'
}

function getHeadline(source: PaywallSource): { headline: string; subhead: string } {
  switch (source) {
    case 'save_limit':
      return {
        headline: 'You’ve saved 5 – your free limit.',
        subhead: 'Plus unlocks unlimited saves.',
      }
    case 'dietary':
      return {
        headline: 'Dietary filters are a Plus feature.',
        subhead: 'Get keto, vegan, halal, gluten-free, and allergen filters.',
      }
    case 'soft_prompt':
      return {
        headline: 'You’re on a roll.',
        subhead: 'Unlock unlimited scans and no ads with Plus.',
      }
    case 'pantry':
      return {
        headline: 'Track what you have.',
        subhead: 'Plus tracks ingredients across scans and flags what to use first.',
      }
    case 'grocery':
      return {
        headline: 'Build your grocery list.',
        subhead: 'Plus turns missing ingredients into a shoppable list.',
      }
    default:
      return {
        headline: 'Cook anything. Waste nothing.',
        subhead: 'Unlock Cookable Plus',
      }
  }
}

const BENEFITS = [
  'Unlimited fridge scans',
  'No ads, ever',
  'Save unlimited recipes',
  'Dietary filters (keto, vegan, gluten-free, halal, allergens)',
  'Pantry tracking',
  'Auto grocery lists',
]

export default function PaywallScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>()
  const router = useRouter()
  const { offerings } = useUserContext()
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual')
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    tone: 'success',
  })

  const paywallSource = (source ?? 'hard_wall') as PaywallSource
  const { headline, subhead } = getHeadline(paywallSource)

  const currentOffering = offerings?.current
  const annualPackage = currentOffering?.annual ?? null
  const monthlyPackage = currentOffering?.monthly ?? null

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error' = 'success') => {
      setToast({ visible: true, message, tone })
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2000)
    },
    [],
  )

  const handlePurchase = useCallback(async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage
    if (!pkg) {
      Alert.alert('Purchase failed', 'Plans are still loading. Try again in a moment.')
      return
    }
    setPurchasing(true)
    try {
      await Purchases.purchasePackage(pkg)
      showToast('You’re in. Welcome to Plus.')
      setTimeout(() => router.back(), 1800)
    } catch (err: any) {
      if (err?.code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        Alert.alert('Purchase failed', 'Couldn’t complete purchase. Try again.')
        console.warn('Paywall purchasePackage error:', err?.code, err?.message)
      }
    } finally {
      setPurchasing(false)
    }
  }, [selectedPlan, annualPackage, monthlyPackage, showToast, router])

  const handleRestore = useCallback(async () => {
    setRestoring(true)
    try {
      const info = await Purchases.restorePurchases()
      if (info.entitlements.active['cookable_plus']) {
        showToast('Restored. Welcome back.')
        setTimeout(() => router.back(), 1800)
      } else {
        Alert.alert('Nothing to restore', 'No purchases to restore on this account.')
      }
    } catch (err: any) {
      console.warn('Paywall restorePurchases error:', err?.message)
      Alert.alert('Restore failed', 'Couldn’t restore purchases. Try again.')
    } finally {
      setRestoring(false)
    }
  }, [showToast, router])

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Close button */}
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={AppColors.textMuted} />
        </Pressable>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subhead}>{subhead}</Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={AppColors.primary} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Plan toggle */}
        <View style={styles.planRow}>
          <Pressable
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'annual' }}
          >
            <View style={styles.planBadgeRow}>
              <Text style={styles.planLabel}>Annual – save 50%</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>BEST DEAL</Text>
              </View>
            </View>
            <Text style={styles.planPrice}>$29.99/year</Text>
            <Text style={styles.planValue}>$2.50/month – best value</Text>
          </Pressable>

          <Pressable
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'monthly' }}
          >
            <Text style={styles.planLabel}>Monthly</Text>
            <Text style={styles.planPrice}>$4.99/month</Text>
          </Pressable>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || restoring}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={AppColors.surface} />
          ) : (
            <Text style={styles.ctaText}>Start 7-day free trial</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.ctaSubtext}>Cancel anytime. No charge today.</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={purchasing || restoring}
            hitSlop={8}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={AppColors.textMuted} />
            ) : (
              <Text style={styles.footerLink}>Restore purchase</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerDot}>·</Text>

          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>

          <Text style={styles.footerDot}>·</Text>

          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },

  closeButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
  },

  // Hero
  hero: {
    marginTop: 16,
    marginBottom: 28,
    gap: 8,
  },
  headline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    lineHeight: 38,
    color: AppColors.text,
  },
  subhead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 22,
    color: AppColors.textMuted,
  },

  // Benefits
  benefits: {
    gap: 12,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  benefitText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.text,
  },

  // Plan toggle
  planRow: {
    gap: 10,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    padding: 14,
    gap: 2,
  },
  planCardSelected: {
    borderColor: AppColors.primary,
    backgroundColor: 'rgba(45, 95, 78, 0.05)',
  },
  planBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  planLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.text,
  },
  badge: {
    backgroundColor: AppColors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: AppColors.surface,
    letterSpacing: 0.5,
  },
  planPrice: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
    color: AppColors.text,
  },
  planValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: AppColors.textMuted,
  },

  // CTA
  ctaButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: AppColors.surface,
  },
  ctaSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: AppColors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 28,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  footerLink: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: AppColors.textMuted,
  },
  footerDot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: AppColors.textLight,
  },
})
