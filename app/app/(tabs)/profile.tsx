import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { AppColors } from '@/constants/Colors'
import { useUserContext } from '@/components/UserProvider'
import { supabase } from '@/lib/supabase'
import { Toast } from '@/components/Toast'

type SkillLevel = 'beginner' | 'intermediate' | 'confident'

const SKILL_OPTIONS: Array<{ value: SkillLevel; title: string; subtitle: string }> = [
  { value: 'beginner', title: 'Beginner', subtitle: 'Show me the basics.' },
  {
    value: 'intermediate',
    title: 'Intermediate',
    subtitle: 'I cook a few times a week.',
  },
  { value: 'confident', title: 'Confident', subtitle: 'I rarely follow recipes.' },
]

const CUISINE_OPTIONS = [
  'Italian',
  'Mexican',
  'Asian',
  'Mediterranean',
  'American',
  'Indian',
  'Middle Eastern',
  'Latin American',
  'French',
  'Comfort food',
]

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Halal',
  'Kosher',
  'Nut-free',
  'Pescatarian',
]

const MAX_CUISINES = 5
const FREE_TIER_WEEKLY_SCAN_LIMIT = 3

type Prefs = {
  skill_level: SkillLevel | null
  preferred_cuisines: string[]
  dietary_filters: string[]
}

type Counters = {
  scan_count_week: number
  scan_week_resets_at: string | null
}

function formatResetDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

export default function ProfileScreen() {
  const { user, profile, isPlus } = useUserContext()
  const router = useRouter()

  const displayName =
    profile?.display_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'Your account'

  const [initial, setInitial] = useState<Prefs | null>(null)
  const [skill, setSkill] = useState<SkillLevel | null>(null)
  const [cuisines, setCuisines] = useState<string[]>([])
  const [dietary, setDietary] = useState<string[]>([])

  const [counters, setCounters] = useState<Counters | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{
    visible: boolean
    message: string
    tone: 'success' | 'error'
  }>({ visible: false, message: '', tone: 'success' })

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error' = 'success') => {
      setToast({ visible: true, message, tone })
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1500)
    },
    [],
  )

  // Load existing prefs + scan counters.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('users')
        .select(
          'skill_level, preferred_cuisines, dietary_filters, scan_count_week, scan_week_resets_at',
        )
        .eq('id', user.id)
        .single()
      if (cancelled) return
      if (error) {
        console.warn('profile load failed:', error.message)
        setLoading(false)
        return
      }
      const next: Prefs = {
        skill_level: (data?.skill_level as SkillLevel | null) ?? null,
        preferred_cuisines: (data?.preferred_cuisines ?? []) as string[],
        dietary_filters: (data?.dietary_filters ?? []) as string[],
      }
      setInitial(next)
      setSkill(next.skill_level)
      setCuisines(next.preferred_cuisines)
      setDietary(next.dietary_filters)
      setCounters({
        scan_count_week: (data?.scan_count_week as number) ?? 0,
        scan_week_resets_at:
          (data?.scan_week_resets_at as string | null) ?? null,
      })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const dirty = useMemo(() => {
    if (!initial) return false
    if (skill !== initial.skill_level) return true
    if (!arraysEqual(cuisines, initial.preferred_cuisines)) return true
    if (!arraysEqual(dietary, initial.dietary_filters)) return true
    return false
  }, [initial, skill, cuisines, dietary])

  const cuisineMaxed = cuisines.length >= MAX_CUISINES

  const toggleCuisine = useCallback(
    (c: string) => {
      setCuisines((curr) => {
        if (curr.includes(c)) return curr.filter((x) => x !== c)
        if (curr.length >= MAX_CUISINES) return curr
        return [...curr, c]
      })
    },
    [],
  )

  const toggleDietary = useCallback((d: string) => {
    setDietary((curr) =>
      curr.includes(d) ? curr.filter((x) => x !== d) : [...curr, d],
    )
  }, [])

  const handleSave = useCallback(async () => {
    if (!user?.id || !dirty || saving) return
    setSaving(true)
    const payload = {
      skill_level: skill,
      preferred_cuisines: cuisines,
      dietary_filters: dietary,
    }
    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id)
    if (error) {
      showToast("Couldn't save — try again.", 'error')
      setSaving(false)
      return
    }
    setInitial({
      skill_level: skill,
      preferred_cuisines: cuisines,
      dietary_filters: dietary,
    })
    showToast('Saved! ✓', 'success')
    setSaving(false)
  }, [user?.id, skill, cuisines, dietary, dirty, saving, showToast])

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) Alert.alert('Error', 'Could not sign out. Try again.')
        },
      },
    ])
  }

  // Scan counter: reset visually if the server window has elapsed.
  const liveScanCount = useMemo(() => {
    if (!counters) return 0
    const reset = counters.scan_week_resets_at
      ? new Date(counters.scan_week_resets_at)
      : null
    if (reset && reset.getTime() < Date.now()) return 0
    return counters.scan_count_week ?? 0
  }, [counters])

  const scanProgressFraction = Math.min(
    1,
    liveScanCount / FREE_TIER_WEEKLY_SCAN_LIMIT,
  )
  const scanBarColor =
    liveScanCount >= FREE_TIER_WEEKLY_SCAN_LIMIT
      ? AppColors.accent
      : AppColors.primary

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={AppColors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity ---------------------------------------------------- */}
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        {user?.email && <Text style={styles.email}>{user.email}</Text>}

        {/* Anonymous: Connect account -------------------------------- */}
        {user?.is_anonymous && (
          <View style={styles.anonymousBanner}>
            <Text style={styles.anonymousTitle}>Guest mode</Text>
            <Text style={styles.anonymousBody}>
              Connect an account to save your recipes across devices.
            </Text>
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.linkButton}
                onPress={async () => {
                  try {
                    const { error } = await supabase.auth.linkIdentity({ provider: 'apple' })
                    if (error) throw error
                    showToast('Account connected', 'success')
                  } catch (err: any) {
                    Alert.alert('Could not connect', err?.message ?? 'Try again.')
                  }
                }}
              />
            )}
            <TouchableOpacity
              style={styles.googleLinkButton}
              onPress={async () => {
                try {
                  const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
                  if (error) throw error
                  showToast('Account connected', 'success')
                } catch (err: any) {
                  Alert.alert('Could not connect', err?.message ?? 'Try again.')
                }
              }}
            >
              <Ionicons name="logo-google" size={18} color={AppColors.text} />
              <Text style={styles.googleLinkText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan counter — hidden for Plus (no quota to show) */}
        {isPlus ? (
          <Text style={styles.plusUnlimited}>Unlimited scans with Plus.</Text>
        ) : (
          <View style={styles.counterWrap}>
            <Text style={styles.counterLabel}>
              {liveScanCount} of {FREE_TIER_WEEKLY_SCAN_LIMIT} scans used this week
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${scanProgressFraction * 100}%`,
                    backgroundColor: scanBarColor,
                  },
                ]}
              />
            </View>
            {counters?.scan_week_resets_at && (
              <Text style={styles.counterReset}>
                Resets {formatResetDate(counters.scan_week_resets_at)}
              </Text>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {/* Skill ------------------------------------------------------- */}
        <Text style={styles.sectionHeading}>How you cook</Text>
        <View style={styles.skillStack}>
          {SKILL_OPTIONS.map((opt) => {
            const selected = skill === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSkill(opt.value)}
                style={[
                  styles.skillTile,
                  selected && styles.skillTileSelected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.skillTitle}>{opt.title}</Text>
                  <Text style={styles.skillSubtitle}>{opt.subtitle}</Text>
                </View>
                {selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={AppColors.primary}
                  />
                )}
              </Pressable>
            )
          })}
        </View>

        {/* Cuisines ---------------------------------------------------- */}
        <Text style={styles.sectionHeading}>Cuisines you like</Text>
        <Text style={styles.sectionHint}>Pick up to 5.</Text>
        <View style={styles.pillRow}>
          {CUISINE_OPTIONS.map((c) => {
            const selected = cuisines.includes(c)
            const dimmed = !selected && cuisineMaxed
            return (
              <Pressable
                key={c}
                onPress={() => !dimmed && toggleCuisine(c)}
                style={[
                  styles.pill,
                  selected && styles.pillCuisineSelected,
                  dimmed && styles.pillDimmed,
                ]}
                disabled={dimmed}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && styles.pillTextSelected,
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Dietary ---------------------------------------------------- */}
        {/* Gated for free users: pills dim to 50%, tapping any opens the
            paywall. Existing selections are preserved (no surprise data
            loss if a Plus user later downgrades). */}
        <View style={styles.dietaryHeadingRow}>
          <Text style={styles.sectionHeading}>Dietary needs</Text>
          {!isPlus && (
            <View style={styles.dietaryLockBadge}>
              <Text style={styles.dietaryLockSeparator}>·</Text>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={AppColors.textMuted}
              />
              <Text style={styles.dietaryLockText}>Plus</Text>
            </View>
          )}
        </View>
        <View style={styles.pillRow}>
          {DIETARY_OPTIONS.map((d) => {
            const selected = dietary.includes(d)
            const locked = !isPlus
            const handlePress = locked
              ? () => router.push('/paywall?source=dietary' as any)
              : () => toggleDietary(d)
            return (
              <Pressable
                key={d}
                onPress={handlePress}
                style={[
                  styles.pill,
                  selected && styles.pillDietarySelected,
                  locked && styles.pillLocked,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: locked }}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && styles.pillTextSelected,
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Save -------------------------------------------------------- */}
        <TouchableOpacity
          style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!dirty || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={AppColors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 64,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  avatarInitial: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 30,
    color: AppColors.surface,
  },
  name: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Scan counter
  counterWrap: {
    gap: 8,
    marginTop: 8,
  },
  counterLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: AppColors.text,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  counterReset: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: AppColors.textMuted,
  },

  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: 24,
  },

  sectionHeading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: AppColors.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: AppColors.textMuted,
    marginBottom: 12,
  },

  // Skill tiles
  skillStack: {
    gap: 10,
    marginBottom: 24,
  },
  skillTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 14,
  },
  skillTileSelected: {
    borderColor: AppColors.primary,
    borderWidth: 1.5,
  },
  skillTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.text,
  },
  skillSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 2,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  pill: {
    backgroundColor: AppColors.surface,
    borderColor: AppColors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillCuisineSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  pillDietarySelected: {
    backgroundColor: AppColors.accent,
    borderColor: AppColors.accent,
  },
  pillDimmed: {
    opacity: 0.5,
  },
  pillLocked: {
    opacity: 0.5,
  },
  dietaryHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dietaryLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dietaryLockSeparator: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
  },
  dietaryLockText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: AppColors.textMuted,
  },
  plusUnlimited: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: AppColors.textMuted,
    marginTop: 8,
  },
  pillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: AppColors.text,
  },
  pillTextSelected: {
    color: AppColors.surface,
  },

  // Save
  saveButton: {
    marginTop: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },

  // Sign out
  signOutButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.error,
    borderRadius: 14,
  },
  signOutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.error,
  },
  anonymousBanner: {
    backgroundColor: '#FBE9CE',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    gap: 12,
  },
  anonymousTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#7A4A0F',
  },
  anonymousBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#7A4A0F',
    lineHeight: 20,
  },
  linkButton: {
    height: 44,
  },
  googleLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  googleLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.text,
  },
})
