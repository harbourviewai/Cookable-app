import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { AppColors } from '@/constants/Colors'
import { useUserContext } from '@/components/UserProvider'
import { supabase } from '@/lib/supabase'

// Dismissible upgrade card that surfaces once, on the user's 2nd lifetime scan
// results screen. Eligibility is strict equality (=== 2) so a user who never
// sees the card mount on scan #2 (e.g. backgrounded the app) won't see it on
// scan #3 either — the soft prompt is a one-time beat by design.
//
// Once dismissed via "Maybe later", `users.soft_prompt_dismissed_at` is
// stamped and the card never returns for that user across sessions.
export function SoftPromptCard() {
  const { user, tier, subscriptionLoading } = useUserContext()
  const router = useRouter()
  const [eligible, setEligible] = useState<boolean | null>(null)

  // Wait until subscription state has resolved — we don't want to flash the
  // card to a Plus user whose tier hasn't caught up from the DB yet.
  useEffect(() => {
    if (!user?.id || subscriptionLoading) return
    if (tier !== 'free') {
      setEligible(false)
      return
    }
    let cancelled = false
    supabase
      .from('users')
      .select('scan_count_lifetime, soft_prompt_dismissed_at')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setEligible(false)
          return
        }
        const lifetime = (data?.scan_count_lifetime as number | null) ?? 0
        const dismissedAt = data?.soft_prompt_dismissed_at as string | null
        setEligible(lifetime === 2 && dismissedAt == null)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, tier, subscriptionLoading])

  if (!eligible) return null

  const handleSeePlus = () => {
    router.push('/paywall?source=soft_prompt' as any)
  }

  const handleMaybeLater = () => {
    // Optimistic hide — server write is fire-and-forget. If the update fails
    // (offline, transient), the card might re-appear on next launch; that's a
    // tolerable failure mode for a once-per-user nudge.
    setEligible(false)
    if (!user?.id) return
    void supabase
      .from('users')
      .update({ soft_prompt_dismissed_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.warn('soft_prompt_dismissed_at write failed:', error.message)
      })
  }

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.heading}>You're on a roll.</Text>
        <Text style={styles.bodyText}>
          Unlock unlimited scans and no ads with Plus.
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={handleSeePlus}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>See Plus</Text>
          </Pressable>
          <Pressable
            style={styles.ghostButton}
            onPress={handleMaybeLater}
            accessibilityRole="button"
          >
            <Text style={styles.ghostButtonText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.border,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.accent,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  heading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.text,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: AppColors.surface,
  },
  ghostButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  ghostButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: AppColors.textMuted,
  },
})
