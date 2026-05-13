import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'
import { RecipeCard } from '@/components/RecipeCard'
import {
  IngredientEditor,
  type DetectedIngredient,
} from '@/components/IngredientEditor'
import { Toast } from '@/components/Toast'
import { AdBanner } from '@/components/AdBanner'
import { SoftPromptCard } from '@/components/SoftPromptCard'
import { useInterstitial } from '@/hooks/useInterstitial'
import {
  useSaveRecipe,
  SAVE_LIMIT_BODY,
  SAVE_LIMIT_TITLE,
} from '@/hooks/useSaveRecipe'
import { useUserContext } from '@/components/UserProvider'
import { Alert } from 'react-native'
import type { Recipe } from '@/types/recipe'

type Scan = {
  id: string
  detected_ingredients: DetectedIngredient[] | null
  recipes: Recipe[] | null
  expiring_count: number | null
  created_at: string
}

const LOW_CONFIDENCE_COPY =
  "Hmm — let's double-check what's in there. Tap any wrong items to remove them, or add what's missing."
const FALLBACK_COPY =
  'We had trouble reading your fridge — add a few items manually.'

function isLowConfidence(ingredients: DetectedIngredient[] | null): boolean {
  if (!ingredients || ingredients.length === 0) return false
  const lowCount = ingredients.filter((i) => i.confidence === 'low').length
  return lowCount / ingredients.length > 0.5
}

// Race the interstitial show against a 1.5s timeout so a slow/missing ad load
// never blocks navigation. Promise.race resolves on whichever finishes first.
const INTERSTITIAL_MAX_WAIT_MS = 1500

function raceWithTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    p,
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ])
}

export default function ScanResultsScreen() {
  const { id, fallback, source } = useLocalSearchParams<{
    id: string
    fallback?: string
    source?: string
  }>()
  const router = useRouter()
  const navigation = useNavigation()
  const interstitial = useInterstitial()
  const { user } = useUserContext()

  const [scan, setScan] = useState<Scan | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [toast, setToast] = useState<{
    visible: boolean
    message: string
    tone: 'success' | 'error'
  }>({ visible: false, message: '', tone: 'success' })

  // Tracks whether the current pending exit has already played its interstitial.
  // beforeRemove fires twice (once when we preventDefault, once after we
  // dispatch the original action) — this flag lets the second pass through.
  const interstitialHandled = useRef(false)
  const authGateShown = useRef(false)

  // Intercept back-style exits (header back, swipe gesture, hardware back) and
  // play the interstitial first if eligible. Forward nav (router.push to a
  // recipe) is handled inside SavableScanRecipeCard via onBeforeNavigate.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (interstitialHandled.current) return
      interstitialHandled.current = true
      e.preventDefault()
      void raceWithTimeout(interstitial.show(), INTERSTITIAL_MAX_WAIT_MS).finally(() => {
        navigation.dispatch(e.data.action)
      })
    })
    return unsub
  }, [navigation, interstitial])

  const handleBeforeNavigate = useCallback(async () => {
    await raceWithTimeout(interstitial.show(), INTERSTITIAL_MAX_WAIT_MS)
  }, [interstitial])

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error' = 'success') => {
      setToast({ visible: true, message, tone })
      setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1500)
    },
    [],
  )

  // The Edge Function failed but we still navigated here so the user can edit
  // ingredients manually. Surface the fallback banner regardless of what's in
  // the row.
  const cameFromFallback = fallback === '1'

  const loadScan = useCallback(async () => {
    if (!id) return
    const { data, error } = await supabase
      .from('scans')
      .select('id, detected_ingredients, recipes, expiring_count, created_at')
      .eq('id', id)
      .single()
    if (error) {
      setLoadError(error.message)
      setScan(null)
    } else {
      setLoadError(null)
      setScan(data as Scan)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    loadScan().finally(() => setLoading(false))
  }, [loadScan])

  const handleCookedThis = useCallback(() => {
    if (authGateShown.current) return
    if (source !== 'onboarding' || user?.is_anonymous !== true) {
      showToast('Nice work — meal marked cooked!', 'success')
      return
    }
    authGateShown.current = true
    router.push('/onboarding/auth-gate?reason=cooked' as any)
  }, [source, user?.is_anonymous, router, showToast])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadScan()
    setRefreshing(false)
  }, [loadScan])

  const handleEditIngredients = useCallback(() => {
    setEditorOpen(true)
  }, [])

  const handleRegenerate = useCallback(
    async ({
      additional_ingredients,
      removed_ingredients,
    }: {
      additional_ingredients: string[]
      removed_ingredients: string[]
    }) => {
      const { error } = await supabase.functions.invoke('generate-recipes', {
        body: { scan_id: id, additional_ingredients, removed_ingredients },
      })
      if (error) throw error
      // Edge Function has already overwritten detected_ingredients + recipes
      // on the scan row. Pull the fresh state in, then dismiss the editor.
      await loadScan()
      setEditorOpen(false)
    },
    [id, loadScan],
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Your recipes' }} />
        <SkeletonResults />
      </View>
    )
  }

  if (loadError || !scan) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Your recipes' }} />
        <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
        <Text style={styles.errorTitle}>Couldn't load this scan</Text>
        <Text style={styles.errorBody}>{loadError ?? 'Scan not found.'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const ingredients = scan.detected_ingredients ?? []
  const recipes = scan.recipes ?? []
  const expiringCount =
    scan.expiring_count ?? ingredients.filter((i) => i.expiring_soon).length
  const showFallbackBanner = cameFromFallback || (recipes.length === 0 && !loading)
  const showLowConfidenceBanner = !showFallbackBanner && isLowConfidence(ingredients)

  return (
    <View style={styles.container}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Stack.Screen 
        options={{ 
          title: 'Your recipes',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.replace('/(tabs)' as any)}
              style={{ marginRight: 8, padding: 8 }}
            >
              <Ionicons name="close" size={24} color={AppColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />

      {/* Soft prompt — appears once, on a free user's 2nd-scan results screen */}
      <SoftPromptCard />

      {/* Banners ------------------------------------------------------------ */}
      {showFallbackBanner && (
        <Banner
          tone="warning"
          text={FALLBACK_COPY}
          ctaLabel="Edit ingredients"
          onCtaPress={handleEditIngredients}
        />
      )}
      {showLowConfidenceBanner && (
        <Banner
          tone="warning"
          text={LOW_CONFIDENCE_COPY}
          ctaLabel="Edit ingredients"
          onCtaPress={handleEditIngredients}
        />
      )}

      {/* Ingredient summary + edit button ---------------------------------- */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryNumber}>{ingredients.length}</Text>
            <Text style={styles.summaryLabel}>
              ingredient{ingredients.length === 1 ? '' : 's'}
            </Text>
          </View>
          {expiringCount > 0 && (
            <View style={styles.summaryStat}>
              <View style={styles.expiringFlag}>
                <View style={styles.expiringDot} />
                <Text style={styles.expiringNumber}>{expiringCount}</Text>
              </View>
              <Text style={styles.summaryLabel}>expiring soon</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditIngredients}>
          <Ionicons name="create-outline" size={18} color={AppColors.primary} />
          <Text style={styles.editButtonText}>Edit ingredients</Text>
        </TouchableOpacity>
      </View>

      {/* Ad banner (free tier only; component returns null for Plus) -------- */}
      <AdBanner placement="results" />

      {/* Recipes ------------------------------------------------------------ */}
      {recipes.length > 0 ? (
        <View style={styles.recipesSection}>
          <Text style={styles.sectionTitle}>3 recipes for tonight</Text>
          {recipes.map((recipe, index) => (
            <SavableScanRecipeCard
              key={index}
              scanId={scan.id}
              index={index}
              source={source}
              recipe={recipe}
              onToast={showToast}
              onBeforeNavigate={handleBeforeNavigate}
              showCookedThis={source === 'onboarding'}
              onCookedThis={handleCookedThis}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyRecipesCard}>
          <Text style={styles.emptyRecipesTitle}>No recipes yet</Text>
          <Text style={styles.emptyRecipesBody}>
            Edit your ingredients above, then tap regenerate.
          </Text>
        </View>
      )}

      <IngredientEditor
        visible={editorOpen}
        original={ingredients}
        onClose={() => setEditorOpen(false)}
        onRegenerate={handleRegenerate}
      />
    </ScrollView>
    <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
    </View>
  )
}

// Each saved card needs its own useSaveRecipe instance so the heart state and
// pending flags are isolated. Wrapping per-card keeps that state colocated.
function SavableScanRecipeCard({
  scanId,
  index,
  source,
  recipe,
  onToast,
  onBeforeNavigate,
  showCookedThis,
  onCookedThis,
}: {
  scanId: string
  index: number
  source?: string
  recipe: Recipe
  onToast: (message: string, tone?: 'success' | 'error') => void
  // Fires before the card navigates to recipe detail. Awaited so the parent
  // can race an interstitial against a short timeout.
  onBeforeNavigate?: () => Promise<void>
  showCookedThis?: boolean
  onCookedThis?: () => void
}) {
  const { user } = useUserContext()
  const router = useRouter()
  const [savedCount, setSavedCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase
      .from('users')
      .select('saved_recipe_count')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) return
        setSavedCount(data?.saved_recipe_count ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const save = useSaveRecipe({ scanId, recipe, savedCount })

  const handlePress = useCallback(async () => {
    if (onBeforeNavigate) await onBeforeNavigate()
    const sourceParam = source ? `?source=${encodeURIComponent(source)}` : ''
    router.push(`/scan/${scanId}/recipe/${index}${sourceParam}` as any)
  }, [onBeforeNavigate, router, scanId, index, source])

  const handleToggle = useCallback(async () => {
    const wasSaved = save.isSaved
    const result = await save.toggle()
    switch (result.kind) {
      case 'saved':
        onToast('Saved! ✓', 'success')
        setSavedCount((c) => (c == null ? 1 : c + 1))
        break
      case 'unsaved':
        setSavedCount((c) => (c == null ? 0 : Math.max(0, c - 1)))
        break
      case 'limit_reached':
        Alert.alert(SAVE_LIMIT_TITLE, SAVE_LIMIT_BODY, [
          { text: 'Maybe later', style: 'cancel', onPress: save.dismissLimit },
          {
            text: 'Upgrade',
            onPress: () => {
              save.dismissLimit()
              router.push('/paywall?source=save_limit' as any)
            },
          },
        ])
        break
      case 'error':
        onToast(
          wasSaved ? "Couldn't unsave — try again." : "Couldn't save — try again.",
          'error',
        )
        break
    }
  }, [save, onToast])

  return (
    <RecipeCard
      scanId={scanId}
      index={index}
      recipe={recipe}
      source={source}
      isSaved={save.isSaved}
      onToggleSave={handleToggle}
      onPress={handlePress}
      onCookedThis={showCookedThis ? onCookedThis : undefined}
    />
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────────
//
// Banner and SkeletonResults stay inline — they're not reused elsewhere yet.
// The recipe card was lifted to components/RecipeCard.tsx in Day 10.

function Banner({
  tone,
  text,
  ctaLabel,
  onCtaPress,
}: {
  tone: 'warning'
  text: string
  ctaLabel?: string
  onCtaPress?: () => void
}) {
  const bg = tone === 'warning' ? '#FBE9CE' : AppColors.surface
  const fg = tone === 'warning' ? '#7A4A0F' : AppColors.text
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <View style={styles.bannerHeader}>
        <Ionicons name="alert-circle-outline" size={18} color={fg} />
        <Text style={[styles.bannerText, { color: fg }]}>{text}</Text>
      </View>
      {ctaLabel && onCtaPress && (
        <TouchableOpacity
          style={[styles.bannerCta, { borderColor: fg }]}
          onPress={onCtaPress}
        >
          <Text style={[styles.bannerCtaText, { color: fg }]}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function SkeletonResults() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={[styles.skeletonBlock, { height: 80 }]} />
      <View style={[styles.skeletonBlock, { height: 120 }]} />
      <View style={[styles.skeletonBlock, { height: 120 }]} />
      <View style={[styles.skeletonBlock, { height: 120 }]} />
      <ActivityIndicator color={AppColors.primary} style={{ marginTop: 24 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },

  // Loading / error
  loadingContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  errorBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  primaryButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: AppColors.surface,
  },

  // Banner
  banner: {
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bannerText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  bannerCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerCtaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  // Summary card
  summaryCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 24,
  },
  summaryStat: {
    gap: 2,
  },
  summaryNumber: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: AppColors.text,
  },
  summaryLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: AppColors.textMuted,
  },
  expiringFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.accent,
  },
  expiringNumber: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: AppColors.accent,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  editButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: AppColors.primary,
  },

  // Recipes
  recipesSection: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
    color: AppColors.text,
    paddingHorizontal: 4,
  },

  emptyRecipesCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: AppColors.border,
    alignItems: 'center',
    gap: 4,
  },
  emptyRecipesTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: AppColors.text,
  },
  emptyRecipesBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
  },

  // Skeleton
  skeletonWrap: {
    gap: 16,
  },
  skeletonBlock: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    opacity: 0.6,
  },
})
