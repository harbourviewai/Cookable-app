import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
  const [loading, setLoading] = useState(false)

  async function handleAppleSignIn() {
    setLoading(true)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple')
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })

      if (error) throw error

      // Apple only returns the user's name on the FIRST sign-in, and it lives on
      // the JS credential — not in the ID token — so the handle_new_user DB trigger
      // can't see it. Persist it to public.users here so we don't lose it forever.
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim()

      if (fullName && data.user) {
        await supabase
          .from('users')
          .update({ display_name: fullName })
          .eq('id', data.user.id)
      }
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return
      console.error('Apple sign-in error:', err)
      Alert.alert('Sign-in failed', 'Could not sign in with Apple. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      const redirectTo = makeRedirectUri({ scheme: 'cookable', path: 'auth/callback' })

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })

      if (error || !data.url) throw error ?? new Error('No OAuth URL returned')

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      if (result.type !== 'success') return

      // Two response shapes are possible:
      //   PKCE flow  → exp://.../auth/callback?code=...        (preferred)
      //   Implicit   → exp://.../auth/callback#access_token=...&refresh_token=...
      // Handle both so we're resilient if PKCE ever falls back.
      const url = new URL(result.url)
      const code = url.searchParams.get('code')
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) throw exchangeError
      } else if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (setSessionError) throw setSessionError
      } else {
        throw new Error('OAuth callback returned no code or tokens')
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err)
      Alert.alert('Sign-in failed', 'Could not sign in with Google. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.wordmark}>Cookable</Text>
        <Text style={styles.tagline}>Cook anything. Waste nothing.</Text>
      </View>

      <View style={styles.bottom}>
        {loading ? (
          <ActivityIndicator color={AppColors.primary} size="large" />
        ) : (
          <>
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            )}

            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
              <Ionicons name="logo-google" size={20} color={AppColors.text} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  wordmark: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 48,
    color: AppColors.primary,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: AppColors.textMuted,
  },
  bottom: {
    gap: 12,
    paddingBottom: 16,
    alignItems: 'stretch',
  },
  appleButton: {
    height: 52,
    borderRadius: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  googleButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.text,
  },
  legal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: AppColors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
})
