import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type PantrySource = 'manual' | 'scan'

export type PantryItem = {
  id: string
  ingredient_name: string
  quantity_estimate: string | null
  added_via: PantrySource
  scan_id: string | null
  expires_at: string | null
  created_at: string
}

type State = {
  items: PantryItem[]
  loading: boolean
  refreshing: boolean
  error: string | null
}

// Ingredients added via scan in the last N days inherit a "Use soon" badge
// since they came from a fridge photo where the AI flagged expiring items.
// Explicit `expires_at` overrides this heuristic (see plan Open Question 5).
export const PANTRY_USE_SOON_DAYS = 3

export function isUseSoon(item: PantryItem): boolean {
  if (item.expires_at) {
    const expiry = new Date(item.expires_at)
    const now = new Date()
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= PANTRY_USE_SOON_DAYS
  }
  if (item.added_via === 'scan') {
    const created = new Date(item.created_at)
    const ageDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    return ageDays <= PANTRY_USE_SOON_DAYS
  }
  return false
}

export function usePantry(userId: string | null) {
  const [state, setState] = useState<State>({
    items: [],
    loading: true,
    refreshing: false,
    error: null,
  })

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!userId) {
        setState({ items: [], loading: false, refreshing: false, error: null })
        return
      }
      setState((s) => ({
        ...s,
        loading: mode === 'initial' ? true : s.loading,
        refreshing: mode === 'refresh',
      }))
      const { data, error } = await supabase
        .from('pantry_items')
        .select('id, ingredient_name, quantity_estimate, added_via, scan_id, expires_at, created_at')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        setState({
          items: [],
          loading: false,
          refreshing: false,
          error: error.message,
        })
        return
      }
      setState({
        items: (data ?? []) as PantryItem[],
        loading: false,
        refreshing: false,
        error: null,
      })
    },
    [userId],
  )

  useEffect(() => {
    void load('initial')
  }, [load])

  const refresh = useCallback(() => load('refresh'), [load])

  const addManual = useCallback(
    async (
      ingredientName: string,
      quantity?: string | null,
      expiresAt?: string | null,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!userId) return { ok: false, error: 'Not signed in' }
      const trimmed = ingredientName.trim().toLowerCase()
      if (!trimmed) return { ok: false, error: 'Ingredient name required' }

      // Upsert by (user_id, ingredient_name) — the partial unique index in
      // migration 001 only fires when deleted_at is null, so a previously
      // soft-deleted row needs an explicit reactivation.
      const { data: existing } = await supabase
        .from('pantry_items')
        .select('id, deleted_at')
        .eq('user_id', userId)
        .eq('ingredient_name', trimmed)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing && existing.deleted_at) {
        const { error } = await supabase
          .from('pantry_items')
          .update({
            deleted_at: null,
            quantity_estimate: quantity?.trim() || null,
            expires_at: expiresAt || null,
            added_via: 'manual',
            scan_id: null,
          })
          .eq('id', existing.id)
        if (error) return { ok: false, error: error.message }
      } else if (existing) {
        const { error } = await supabase
          .from('pantry_items')
          .update({
            quantity_estimate: quantity?.trim() || null,
            expires_at: expiresAt || null,
          })
          .eq('id', existing.id)
        if (error) return { ok: false, error: error.message }
      } else {
        const { error } = await supabase.from('pantry_items').insert({
          user_id: userId,
          ingredient_name: trimmed,
          quantity_estimate: quantity?.trim() || null,
          expires_at: expiresAt || null,
          added_via: 'manual',
        })
        if (error) return { ok: false, error: error.message }
      }

      await load('refresh')
      return { ok: true }
    },
    [userId, load],
  )

  const remove = useCallback(
    async (itemId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      // Optimistic UI update — drop from local state immediately, roll back on error.
      const prev = state.items
      setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) }))
      const { error } = await supabase
        .from('pantry_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId)
      if (error) {
        setState((s) => ({ ...s, items: prev }))
        return { ok: false, error: error.message }
      }
      return { ok: true }
    },
    [state.items],
  )

  return {
    items: state.items,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    refresh,
    addManual,
    remove,
  }
}
