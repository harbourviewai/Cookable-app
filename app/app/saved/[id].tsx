import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { AppColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'
import { RecipeDetail } from '@/components/RecipeDetail'
import type { Recipe } from '@/types/recipe'

type SavedRow = {
  id: string
  scan_id: string | null
  title: string
  cuisine: string | null
  cook_time_minutes: number | null
  difficulty: string | null
  ingredients_used: any
  ingredients_missing: any
  steps: any
  why_this_recipe: string | null
}

function rowToRecipe(row: SavedRow): Recipe {
  return {
    title: row.title,
    cuisine: row.cuisine ?? '',
    cook_time_minutes: row.cook_time_minutes ?? 0,
    difficulty: row.difficulty ?? '',
    uses_expiring: [],
    ingredients_used: (row.ingredients_used ?? []) as Recipe['ingredients_used'],
    ingredients_missing: (row.ingredients_missing ??
      []) as Recipe['ingredients_missing'],
    steps: (row.steps ?? []) as string[],
    why_this_recipe: row.why_this_recipe ?? '',
  }
}

export default function SavedRecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [row, setRow] = useState<SavedRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      const { data, error: dbError } = await supabase
        .from('saved_recipes')
        .select(
          'id, scan_id, title, cuisine, cook_time_minutes, difficulty, ingredients_used, ingredients_missing, steps, why_this_recipe',
        )
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (cancelled) return

      if (dbError) {
        setError(dbError.message)
        setLoading(false)
        return
      }

      setRow(data as SavedRow)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Recipe' }} />
        <ActivityIndicator color={AppColors.primary} />
      </View>
    )
  }

  if (error || !row) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Recipe' }} />
        <Text style={styles.notFoundTitle}>Recipe not found</Text>
        <Text style={styles.notFoundBody}>
          {error ?? "We couldn't find that saved recipe."}
        </Text>
      </View>
    )
  }

  return (
    <RecipeDetail
      recipe={rowToRecipe(row)}
      savedId={row.id}
      scanId={row.scan_id ?? undefined}
      popOnUnsave
    />
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  notFoundTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: AppColors.text,
    textAlign: 'center',
  },
  notFoundBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
})
