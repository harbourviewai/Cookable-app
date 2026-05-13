import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'
import { Toast } from '@/components/Toast'
import {
  useSaveRecipe,
  SAVE_LIMIT_BODY,
  SAVE_LIMIT_TITLE,
} from '@/hooks/useSaveRecipe'
import { useUserContext } from '@/components/UserProvider'
import { supabase } from '@/lib/supabase'
import { useGroceryList } from '@/hooks/useGroceryList'
import type { Recipe } from '@/types/recipe'

type Props = {
  recipe: Recipe
  // When known, pre-seeds the heart as filled. From the saved-detail screen,
  // this comes from the route param. From scan-detail it's null and the hook
  // looks one up by (scan_id, title).
  savedId?: string | null
  scanId?: string
  // True when this detail screen owns a saved row (saved/[id]). On unsave
  // we pop back to wherever the user came from.
  popOnUnsave?: boolean
  onCookedThis?: () => void
}

export function RecipeDetail({
  recipe,
  savedId = null,
  scanId,
  popOnUnsave = false,
  onCookedThis,
}: Props) {
  const router = useRouter()
  const { user, isPlus } = useUserContext()
  const grocery = useGroceryList(user?.id ?? null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [addingToGrocery, setAddingToGrocery] = useState(false)
  const [toast, setToast] = useState<{
    visible: boolean
    message: string
    tone: 'success' | 'error'
  }>({ visible: false, message: '', tone: 'success' })

  // Pull the user's saved_recipe_count once so the hook can short-circuit
  // a 6th save without a network round-trip.
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

  const save = useSaveRecipe({
    savedId,
    scanId,
    recipe,
    savedCount,
  })

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error' = 'success') => {
      setToast({ visible: true, message, tone })
      setTimeout(
        () => setToast((t) => ({ ...t, visible: false })),
        1500,
      )
    },
    [],
  )

  const handleHeartPress = useCallback(async () => {
    const wasSaved = save.isSaved
    const result = await save.toggle()
    switch (result.kind) {
      case 'saved':
        showToast('Saved! ✓', 'success')
        // Bump local count so the limit check stays accurate without a refetch.
        setSavedCount((c) => (c == null ? 1 : c + 1))
        break
      case 'unsaved':
        setSavedCount((c) => (c == null ? 0 : Math.max(0, c - 1)))
        if (popOnUnsave) {
          // Slight delay so the heart animation registers before nav.
          setTimeout(() => router.back(), 80)
        }
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
        showToast(
          wasSaved ? "Couldn't unsave — try again." : "Couldn't save — try again.",
          'error',
        )
        break
    }
  }, [save, showToast, popOnUnsave, router])

  const handleAddToGrocery = useCallback(async () => {
    if (!isPlus) {
      router.push('/paywall?source=grocery' as any)
      return
    }
    if (!recipe.ingredients_missing || recipe.ingredients_missing.length === 0) return
    if (addingToGrocery) return
    setAddingToGrocery(true)
    const result = await grocery.addToList(
      recipe.ingredients_missing.map((m) => ({
        ingredient_name: m.name,
        quantity: m.amount ?? null,
        // Only saved-recipe rows have a saved id; scan-detail unsaved
        // recipes don't yet have one. Either way the source link is best-effort.
        source_recipe_id: save.savedId ?? null,
      })),
    )
    setAddingToGrocery(false)
    if (!result.ok) {
      showToast("Couldn't add — try again.", 'error')
      return
    }
    if (result.added === 0) {
      showToast('Already on your list.', 'success')
      return
    }
    showToast(`Added ${result.added} to grocery list ✓`, 'success')
  }, [isPlus, recipe.ingredients_missing, grocery, save.savedId, router, showToast, addingToGrocery])

  const usesExpiring = recipe.uses_expiring && recipe.uses_expiring.length > 0
  const hasMissing =
    recipe.ingredients_missing && recipe.ingredients_missing.length > 0
  const hasWhy = recipe.why_this_recipe && recipe.why_this_recipe.trim().length > 0

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Recipe',
          headerRight: () => (
            <Pressable
              onPress={handleHeartPress}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={save.isSaved ? 'Unsave recipe' : 'Save recipe'}
              disabled={save.isPending}
            >
              <Ionicons
                name={save.isSaved ? 'heart' : 'heart-outline'}
                size={24}
                color={save.isSaved ? AppColors.accent : AppColors.text}
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header --------------------------------------------------------- */}
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{recipe.cuisine}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{recipe.cook_time_minutes} min</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaDifficulty}>{recipe.difficulty}</Text>
        </View>

        {/* Expiring-soon callout ------------------------------------------ */}
        {usesExpiring && (
          <View style={styles.expiringCard}>
            <View style={styles.expiringHeaderRow}>
              <View style={styles.expiringDot} />
              <Text style={styles.expiringHeading}>
                This recipe uses your soon-to-expire items
              </Text>
            </View>
            <Text style={styles.expiringList}>
              {recipe.uses_expiring.join(', ')}
            </Text>
          </View>
        )}

        {/* why_this_recipe quote callout ---------------------------------- */}
        {hasWhy && (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>{recipe.why_this_recipe}</Text>
          </View>
        )}

        {/* Ingredients you have ------------------------------------------- */}
        {recipe.ingredients_used && recipe.ingredients_used.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Ingredients you have</Text>
            <View style={styles.list}>
              {recipe.ingredients_used.map((item, i) => (
                <View key={`have-${i}`} style={styles.haveRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={AppColors.success}
                  />
                  <Text style={styles.itemName}>{item.name}</Text>
                  {!!item.amount && (
                    <>
                      <Text style={styles.itemDot}>·</Text>
                      <Text style={styles.itemAmount}>{item.amount}</Text>
                    </>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* You'll also need ---------------------------------------------- */}
        {hasMissing ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>You'll also need</Text>
            <View style={styles.list}>
              {recipe.ingredients_missing.map((item, i) => (
                <View key={`need-${i}`} style={styles.needRow}>
                  <View style={styles.needBullet} />
                  <Text style={styles.itemName}>{item.name}</Text>
                  {!!item.amount && (
                    <>
                      <Text style={styles.itemDot}>·</Text>
                      <Text style={styles.itemAmount}>{item.amount}</Text>
                    </>
                  )}
                  {item.optional && (
                    <Text style={styles.optional}> (optional)</Text>
                  )}
                </View>
              ))}
            </View>
            <Pressable
              style={styles.groceryButton}
              onPress={handleAddToGrocery}
              accessibilityRole="button"
              accessibilityLabel="Add to grocery list"
              disabled={addingToGrocery}
            >
              <Ionicons
                name={isPlus ? 'cart-outline' : 'lock-closed-outline'}
                size={16}
                color={AppColors.primary}
              />
              <Text style={styles.groceryButtonText}>
                {isPlus ? 'Add to grocery list' : 'Add to grocery list · Plus'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.allSet}>You've got everything.</Text>
          </View>
        )}

        {/* Steps ---------------------------------------------------------- */}
        {recipe.steps && recipe.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Steps</Text>
            <View style={styles.stepsList}>
              {recipe.steps.map((step, i) => (
                <View key={`step-${i}`} style={styles.stepRow}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {onCookedThis && (
          <Pressable
            onPress={onCookedThis}
            style={({ pressed }) => [
              styles.cookedButton,
              pressed && styles.cookedButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`I cooked ${recipe.title}`}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={AppColors.surface} />
            <Text style={styles.cookedButtonText}>I Cooked This</Text>
          </Pressable>
        )}
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
    padding: 16,
    paddingBottom: 48,
  },

  // Header
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: AppColors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  meta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
  },
  metaDot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textLight,
  },
  metaDifficulty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    textTransform: 'capitalize',
  },

  // Expiring-soon callout
  expiringCard: {
    backgroundColor: '#FBE9CE',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 6,
  },
  expiringHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.accent,
  },
  expiringHeading: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#7A4A0F',
  },
  expiringList: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#7A4A0F',
    textTransform: 'capitalize',
    paddingLeft: 16,
  },

  // why_this_recipe quote
  quoteCard: {
    backgroundColor: 'rgba(45, 95, 78, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  quoteText: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 17,
    lineHeight: 24,
    fontStyle: 'italic',
    color: AppColors.text,
  },

  // Sections
  section: {
    marginTop: 16,
  },
  sectionHeading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: AppColors.text,
    marginBottom: 8,
  },
  list: {
    gap: 6,
  },

  // Have / need rows
  haveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  needRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  needBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.textLight,
  },
  itemName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: AppColors.text,
    textTransform: 'capitalize',
  },
  itemDot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textLight,
  },
  itemAmount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
  },
  optional: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: AppColors.textLight,
  },
  allSet: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
  },
  groceryButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  groceryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: AppColors.primary,
  },

  // Steps
  stepsList: {
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: AppColors.surface,
    lineHeight: 16,
  },
  stepText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    color: AppColors.text,
  },
  cookedButton: {
    marginTop: 20,
    backgroundColor: AppColors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cookedButtonPressed: {
    opacity: 0.85,
  },
  cookedButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AppColors.surface,
  },
})
