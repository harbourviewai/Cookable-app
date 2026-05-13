import { useState } from 'react'
import { Alert, Text, View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { OnboardingFrame } from '@/components/OnboardingFrame'
import { supabase } from '@/lib/supabase'
import { markOnboardingScanStarted, persistOnboardingAnswers } from '@/lib/onboarding'
import { AppColors } from '@/constants/Colors'

export default function FirstScanScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function ensureAnonymousSession() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session?.user) return sessionData.session.user

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) throw error ?? new Error('Could not start anonymous session')
    return data.user
  }

  async function startScan(useLibrary: boolean) {
    setLoading(true)
    try {
      const user = await ensureAnonymousSession()
      await persistOnboardingAnswers(user.id)
      await markOnboardingScanStarted()
      const query = useLibrary ? '&pick=library' : ''
      router.replace(`/(tabs)/camera?source=onboarding${query}` as any)
    } catch (err: any) {
      Alert.alert('Could not start scan', err?.message ?? 'Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingFrame
      headline="Ready to cook?"
      subhead="Open your fridge or pantry, and snap a photo. We'll handle the rest."
      primaryLabel={loading ? 'Opening camera…' : 'Open Camera'}
      onPrimaryPress={() => startScan(false)}
      primaryDisabled={loading}
      secondaryLabel="Use a saved photo"
      onSecondaryPress={() => startScan(true)}
    >
      <View style={styles.cameraCircle}>
        <Ionicons name="camera-outline" size={54} color={AppColors.primary} />
      </View>
      <View style={styles.tipBox}>
        <Text style={styles.tipLabel}>Tip:</Text>
        <Text style={styles.tipBody}>
          Get a clear shot — you can edit the ingredient list before recipes are generated.
        </Text>
      </View>
    </OnboardingFrame>
  )
}

const styles = StyleSheet.create({
  cameraCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#EEF6F2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  tipBox: {
    backgroundColor: '#FBE9CE',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  tipLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#7A4A0F',
  },
  tipBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#7A4A0F',
  },
})
