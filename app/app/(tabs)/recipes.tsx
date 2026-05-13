import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { AppColors } from '@/constants/Colors'
import { supabase } from '@/lib/supabase'
import { RecipeCard } from '@/components/RecipeCard'
import { Toast } from '@/components/Toast'
import { useUser } from '@/hooks/useUser'

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
  created_at: string
  deleted_at: string | null
}

export default function RecipesScreen() {
  const router = useRouter()
  const { user } = useUser()

  const [rows, setRows] = useState<SavedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const load = useCallback(async () => {
    if (!user?.id) return
    const { data, error: fetchErr } = await supabase
      .from('saved_recipes')
      .select(
        'id, scan_id, title, cuisine, cook_time_minutes, difficulty, ingredients_used, ingredients_missing, steps, why_this_recipe, created_at, deleted_at',
      )
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (fetchErr) {
      setError(fetchErr.message)
      setRows([])
    } else {
      setError(null)
      setRows((data ?? []) as SavedRow[])
    }
  }, [user?.id])

  // Pull every time the tab gains focus so saves elsewhere are reflected.
  useFocusEffect(
    useCallback(() => {
      let active = true
      ;(async () => {
        if (!active) return
        setLoading(true)
        await load()
        if (active) setLoading(false)
      })()
      return () => {
        active = false
      }
    }, [load]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleLongPress = useCallback(
    (row: SavedRow) => {
      Alert.alert('Remove this recipe?', '', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Optimistic remove from list.
            const prev = rows
            setRows((rs) => rs.filter((r) => r.id !== row.id))

            const { error: upErr } = await supabase
              .from('saved_recipes')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', row.id)
            if (upErr) {
              setRows(prev)
              showToast("Couldn't remove — try again.", 'error')
              return
            }
            // Decrement counter.
            if (user?.id) {
              const { data: profile } = await supabase
                .from('users')
                .select('saved_recipe_count')
                .eq('id', user.id)
                .single()
              const next = Math.max(0, (profile?.saved_recipe_count ?? 1) - 1)
              await supabase
                .from('users')
                .update({ saved_recipe_count: next })
                .eq('id', user.id)
            }
          },
        },
      ])
    },
    [rows, user?.id, showToast],
  )

  if (loading) {
    return (
      <View style={styles.skeletonContainer}>
        <View style={[styles.skeletonBlock, { height: 110 }]} />
        <View style={[styles.skeletonBlock, { height: 110 }]} />
        <View style={[styles.skeletonBlock, { height: 110 }]} />
        <ActivityIndicator color={AppColors.primary} style={{ marginTop: 24 }} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't load saved recipes</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    )
  }

  if (rows.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyHeading}>Your saved recipes.</Text>
        <Text style={styles.emptyBody}>
          Nothing saved yet — snap a photo to get started.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {rows.map((row) => (
          <RecipeCard
            key={row.id}
            recipe={{
              title: row.title,
              cuisine: row.cuisine ?? '',
              cook_time_minutes: row.cook_time_minutes ?? 0,
              difficulty: row.difficulty ?? '',
              uses_expiring: [],
            }}
            isSaved
            onToggleSave={() => handleLongPress(row)}
            onPress={() => router.push(`/saved/${row.id}` as any)}
            onLongPress={() => handleLongPress(row)}
          />
        ))}
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} tone={toast.tone} />
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
    gap: 12,
    paddingBottom: 48,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    padding: 16,
    gap: 16,
  },
  skeletonBlock: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyHeading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 22,
    color: AppColors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
    color: AppColors.text,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
})
