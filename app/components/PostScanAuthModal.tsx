import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { AppColors } from '@/constants/Colors'
import { completeOnboardingForUser } from '@/lib/onboarding'

type Props = {
  userId?: string
  onComplete: () => void
  onMaybeLater?: () => void
  required?: boolean
  headline?: string
  subhead?: string
}

type Provider = 'apple' | 'google'

export function PostScanAuthModal({
  userId,
  onComplete,
  onMaybeLater,
  required = false,
  headline = 'Save these for later?',
  subhead = 'Sign in to save your recipes and unlock unlimited use.',
}: Props) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)

  async function link(provider: Provider) {
    setLoadingProvider(provider)
    try {
      const { error } = await supabase.auth.linkIdentity({ provider })
      if (error) throw error
      await completeOnboardingForUser(userId)
      onComplete()
    } catch (err: any) {
      Alert.alert('Sign-in failed', err?.message ?? 'Could not finish sign-in. Try again.')
    } finally {
      setLoadingProvider(null)
    }
  }

  async function maybeLater() {
    await completeOnboardingForUser(userId)
    onMaybeLater?.()
  }

  const googleButton = (
    <TouchableOpacity
      key="google"
      style={styles.authButton}
      onPress={() => link('google')}
      disabled={loadingProvider !== null}
    >
      {loadingProvider === 'google' ? (
        <ActivityIndicator color={AppColors.text} />
      ) : (
        <Ionicons name="logo-google" size={20} color={AppColors.text} />
      )}
      <Text style={styles.authButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  )

  const appleButton = Platform.OS === 'ios' ? (
    <AppleAuthentication.AppleAuthenticationButton
      key="apple"
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={14}
      style={styles.appleButton}
      onPress={() => link('apple')}
    />
  ) : null

  const buttons = Platform.OS === 'ios' ? [appleButton, googleButton] : [googleButton, appleButton]

  return (
    <View style={styles.card}>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.subhead}>{subhead}</Text>
      <View style={styles.buttons}>{buttons}</View>
      {!required && (
        <TouchableOpacity style={styles.secondaryButton} onPress={maybeLater}>
          <Text style={styles.secondaryButtonText}>Maybe later</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 14,
  },
  headline: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
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
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  appleButton: {
    height: 52,
  },
  authButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  authButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.text,
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
