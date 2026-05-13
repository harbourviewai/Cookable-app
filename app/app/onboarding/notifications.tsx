import { useState } from 'react'
import { Text, View, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { OnboardingFrame } from '@/components/OnboardingFrame'
import { AppColors } from '@/constants/Colors'

export default function NotificationsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function continueNext() {
    router.push('/onboarding/first-scan' as any)
  }

  async function requestReminder() {
    setLoading(true)
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status === 'granted') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Cookable',
            body: "Sunday — what's in your fridge?",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 1,
            hour: 17,
            minute: 0,
          },
        })
      }
    } finally {
      setLoading(false)
      continueNext()
    }
  }

  return (
    <OnboardingFrame
      headline="Want a weekly nudge?"
      subhead="We'll send you a gentle reminder when it's time to plan meals. No spam, ever."
      primaryLabel={loading ? 'Setting reminder…' : 'Yes, remind me'}
      onPrimaryPress={requestReminder}
      primaryDisabled={loading}
      secondaryLabel="Not now"
      onSecondaryPress={continueNext}
    >
      <View style={styles.preview}>
        <Text style={styles.previewIcon}>{Platform.OS === 'ios' ? '🔔' : '🔔'}</Text>
        <View style={styles.previewTextWrap}>
          <Text style={styles.previewTitle}>Cookable</Text>
          <Text style={styles.previewBody}>Sunday — what's in your fridge?</Text>
        </View>
      </View>
    </OnboardingFrame>
  )
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: AppColors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: AppColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  previewIcon: {
    fontSize: 28,
  },
  previewTextWrap: {
    flex: 1,
    gap: 3,
  },
  previewTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.text,
  },
  previewBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
  },
})
