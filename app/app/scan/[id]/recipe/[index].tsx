import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { AppColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'
import { RecipeDetail } from '@/components/RecipeDetail'
import type { Recipe } from '@/types/recipe'

export default function RecipeDetailScreen() {
  const { id, index, source } = useLocalSearchParams<{
    id: string
    index: string
    source?: string
  }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      const { data, error: dbError } = await supabase
        .from('scans')
        .select('recipes')
        .eq('id', id)
        .single()

      if (cancelled) return

      if (dbError) {
        setError(dbError.message)
        setLoading(false)
        return
      }

      const recipes = (data?.recipes ?? []) as Recipe[]
      const i = Number(index)
      const picked = Number.isFinite(i) ? recipes[i] : undefined
      setRecipe(picked ?? null)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, index])

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Recipe' }} />
        <ActivityIndicator color={AppColors.primary} />
      </View>
    )
  }

  if (error || !recipe) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Recipe' }} />
        <Text style={styles.notFoundTitle}>Recipe not found</Text>
        <Text style={styles.notFoundBody}>
          {error ?? "We couldn't find that recipe."}
        </Text>
      </View>
    )
  }

  return (
    <RecipeDetail
      recipe={recipe}
      scanId={id}
      onCookedThis={
        source === 'onboarding'
          ? () => router.push('/onboarding/auth-gate?reason=cooked' as any)
          : undefined
      }
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
