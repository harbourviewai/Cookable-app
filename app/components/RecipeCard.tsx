import { useCallback } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AppColors } from '@/constants/Colors'

export type RecipeSummary = {
  title: string
  cuisine: string
  cook_time_minutes: number
  difficulty: string
  uses_expiring: string[]
}

type Props = {
  // For results-screen cards.
  scanId?: string
  index?: number
  source?: string
  recipe: RecipeSummary
  // Save state. When provided the heart is rendered.
  isSaved?: boolean
  onToggleSave?: () => void
  // Long-press handler — used by the Recipes tab for soft-delete.
  onLongPress?: () => void
  // Tap target override. Default behaviour for results-screen cards is to
  // route to the per-scan recipe detail; saved cards in the Recipes tab
  // pass an onPress that goes to /saved/[id] instead.
  onPress?: () => void
  onCookedThis?: () => void
}

export const EXPIRING_PILL_COPY = 'Uses expiring items'

export function RecipeCard({
  scanId,
  index,
  source,
  recipe,
  isSaved,
  onToggleSave,
  onPress,
  onLongPress,
  onCookedThis,
}: Props) {
  const router = useRouter()
  const usesExpiring = recipe.uses_expiring && recipe.uses_expiring.length > 0
  const showHeart = typeof onToggleSave === 'function'

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress()
      return
    }
    if (scanId && typeof index === 'number') {
      const sourceParam = source ? `?source=${encodeURIComponent(source)}` : ''
      router.push(`/scan/${scanId}/recipe/${index}${sourceParam}` as any)
    }
  }, [router, scanId, index, source, onPress])

  const handleHeart = useCallback(
    (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.()
      onToggleSave?.()
    },
    [onToggleSave],
  )

  const handleCookedThis = useCallback(
    (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.()
      onCookedThis?.()
    },
    [onCookedThis],
  )

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}, ${recipe.cuisine}, ${recipe.cook_time_minutes} minutes, ${recipe.difficulty}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{recipe.title}</Text>
        {showHeart && (
          <Pressable
            onPress={handleHeart}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Unsave recipe' : 'Save recipe'}
            style={styles.heartHit}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={22}
              color={isSaved ? AppColors.accent : AppColors.text}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{recipe.cuisine}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>{recipe.cook_time_minutes} min</Text>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyBadgeText}>{recipe.difficulty}</Text>
        </View>
      </View>

      {usesExpiring && (
        <View style={styles.expiringPill}>
          <View style={styles.expiringDot} />
          <Text style={styles.expiringText}>{EXPIRING_PILL_COPY}</Text>
        </View>
      )}

      {onCookedThis && (
        <Pressable
          onPress={handleCookedThis}
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
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    lineHeight: 28,
    color: AppColors.text,
  },
  heartHit: {
    marginTop: 2,
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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
  difficultyBadge: {
    backgroundColor: AppColors.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  difficultyBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: AppColors.textMuted,
    textTransform: 'capitalize',
  },
  expiringPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBE9CE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  expiringDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.accent,
  },
  expiringText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#7A4A0F',
  },
  cookedButton: {
    marginTop: 4,
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
