import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Recipe } from '@/types/recipe'

const FREE_TIER_SAVE_LIMIT = 5

type Args = {
  // Pass an existing saved_recipes row id when known (e.g. coming from
  // the Recipes tab or saved/[id]). Detail screens that don't know yet
  // can pass null and the hook will look one up by (scan_id, title).
  savedId?: string | null
  scanId?: string
  recipe: Recipe | null
  // Free-tier guard. Caller passes the user's current saved_recipe_count;
  // hook uses it to short-circuit before hitting the network.
  savedCount?: number | null
}

type State = {
  isSaved: boolean
  savedId: string | null
  isPending: boolean
  limitReached: boolean
}

export type SaveToggleResult =
  | { kind: 'saved'; savedId: string }
  | { kind: 'unsaved' }
  | { kind: 'limit_reached' }
  | { kind: 'error'; error: Error }

export function useSaveRecipe({ savedId, scanId, recipe, savedCount }: Args) {
  const [state, setState] = useState<State>({
    isSaved: !!savedId,
    savedId: savedId ?? null,
    isPending: false,
    limitReached: false,
  })
  const lookupRanRef = useRef(false)

  // If we don't know up-front whether this recipe is saved, look up by
  // (scan_id, title) once the recipe is available.
  useEffect(() => {
    if (savedId !== undefined && savedId !== null) {
      setState((s) => ({ ...s, isSaved: true, savedId }))
      return
    }
    if (lookupRanRef.current) return
    if (!scanId || !recipe?.title) return
    lookupRanRef.current = true

    let cancelled = false
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) return
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('id')
        .eq('user_id', userId)
        .eq('scan_id', scanId)
        .eq('title', recipe.title)
        .is('deleted_at', null)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.warn('useSaveRecipe lookup failed:', error.message)
        return
      }
      if (data?.id) {
        setState((s) => ({ ...s, isSaved: true, savedId: data.id }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [savedId, scanId, recipe?.title])

  const toggle = useCallback(async (): Promise<SaveToggleResult> => {
    if (!recipe) return { kind: 'error', error: new Error('No recipe') }

    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return { kind: 'error', error: new Error('Not signed in') }

    // Snapshot for rollback.
    const prev = state

    if (prev.isSaved && prev.savedId) {
      // ── Unsave ─────────────────────────────────────────────────────
      setState({
        isSaved: false,
        savedId: null,
        isPending: true,
        limitReached: false,
      })

      const { error: updateErr } = await supabase
        .from('saved_recipes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', prev.savedId)

      if (updateErr) {
        setState({ ...prev, isPending: false })
        return { kind: 'error', error: new Error(updateErr.message) }
      }

      // Decrement counter (best-effort; not load-bearing for UI).
      const { data: profile } = await supabase
        .from('users')
        .select('saved_recipe_count')
        .eq('id', userId)
        .single()
      const next = Math.max(0, (profile?.saved_recipe_count ?? 1) - 1)
      await supabase.from('users').update({ saved_recipe_count: next }).eq('id', userId)

      setState((s) => ({ ...s, isPending: false }))
      return { kind: 'unsaved' }
    }

    // ── Save ────────────────────────────────────────────────────────
    if (typeof savedCount === 'number' && savedCount >= FREE_TIER_SAVE_LIMIT) {
      setState((s) => ({ ...s, limitReached: true }))
      return { kind: 'limit_reached' }
    }

    setState({
      isSaved: true,
      savedId: null,
      isPending: true,
      limitReached: false,
    })

    const insertRow = {
      user_id: userId,
      scan_id: scanId ?? null,
      title: recipe.title,
      cuisine: recipe.cuisine,
      cook_time_minutes: recipe.cook_time_minutes,
      difficulty: recipe.difficulty,
      ingredients_used: recipe.ingredients_used,
      ingredients_missing: recipe.ingredients_missing,
      steps: recipe.steps,
      why_this_recipe: recipe.why_this_recipe,
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('saved_recipes')
      .insert(insertRow)
      .select('id')
      .single()

    if (insertErr || !inserted?.id) {
      setState({ ...prev, isPending: false })
      return {
        kind: 'error',
        error: new Error(insertErr?.message ?? 'Insert failed'),
      }
    }

    // Increment counter.
    const { data: profile } = await supabase
      .from('users')
      .select('saved_recipe_count')
      .eq('id', userId)
      .single()
    const next = (profile?.saved_recipe_count ?? 0) + 1
    await supabase.from('users').update({ saved_recipe_count: next }).eq('id', userId)

    setState({
      isSaved: true,
      savedId: inserted.id,
      isPending: false,
      limitReached: false,
    })
    return { kind: 'saved', savedId: inserted.id }
  }, [recipe, scanId, savedCount, state])

  const dismissLimit = useCallback(() => {
    setState((s) => ({ ...s, limitReached: false }))
  }, [])

  return {
    isSaved: state.isSaved,
    savedId: state.savedId,
    isPending: state.isPending,
    limitReached: state.limitReached,
    toggle,
    dismissLimit,
  }
}

export const SAVE_LIMIT_TITLE = "You've saved 5 – your free limit."
export const SAVE_LIMIT_BODY = 'Plus unlocks unlimited saves.'
