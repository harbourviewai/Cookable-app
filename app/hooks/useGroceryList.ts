import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type GroceryItem = {
  id: string
  list_id: string
  ingredient_name: string
  quantity: string | null
  source_recipe_id: string | null
  source_recipe_title: string | null
  is_checked: boolean
  sort_order: number
  created_at: string
}

export type GroceryListMeta = {
  id: string
  name: string | null
  created_at: string
}

type State = {
  list: GroceryListMeta | null
  items: GroceryItem[]
  loading: boolean
  refreshing: boolean
  error: string | null
}

export type AddToListInput = {
  ingredient_name: string
  quantity?: string | null
  source_recipe_id?: string | null
}

export type AddToListResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string }

export function useGroceryList(userId: string | null) {
  const [state, setState] = useState<State>({
    list: null,
    items: [],
    loading: true,
    refreshing: false,
    error: null,
  })

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!userId) {
        setState({ list: null, items: [], loading: false, refreshing: false, error: null })
        return
      }
      setState((s) => ({
        ...s,
        loading: mode === 'initial' ? true : s.loading,
        refreshing: mode === 'refresh',
      }))

      const { data: lists, error: listErr } = await supabase
        .from('grocery_lists')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .is('completed_at', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
      if (listErr) {
        setState({
          list: null,
          items: [],
          loading: false,
          refreshing: false,
          error: listErr.message,
        })
        return
      }

      const list = (lists?.[0] as GroceryListMeta | undefined) ?? null
      if (!list) {
        setState({ list: null, items: [], loading: false, refreshing: false, error: null })
        return
      }

      const { data: items, error: itemsErr } = await supabase
        .from('grocery_items')
        .select(
          'id, list_id, ingredient_name, quantity, source_recipe_id, is_checked, sort_order, created_at, saved_recipes(title)',
        )
        .eq('list_id', list.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (itemsErr) {
        setState({
          list,
          items: [],
          loading: false,
          refreshing: false,
          error: itemsErr.message,
        })
        return
      }

      const normalized: GroceryItem[] = (items ?? []).map((row: any) => ({
        id: row.id,
        list_id: row.list_id,
        ingredient_name: row.ingredient_name,
        quantity: row.quantity,
        source_recipe_id: row.source_recipe_id,
        source_recipe_title: row.saved_recipes?.title ?? null,
        is_checked: !!row.is_checked,
        sort_order: row.sort_order ?? 0,
        created_at: row.created_at,
      }))

      setState({
        list,
        items: normalized,
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

  const ensureList = useCallback(async (): Promise<{ ok: true; listId: string } | { ok: false; error: string }> => {
    if (!userId) return { ok: false, error: 'Not signed in' }
    if (state.list) return { ok: true, listId: state.list.id }
    const { data, error } = await supabase
      .from('grocery_lists')
      .insert({ user_id: userId })
      .select('id, name, created_at')
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? 'Insert failed' }
    setState((s) => ({ ...s, list: data as GroceryListMeta }))
    return { ok: true, listId: data.id }
  }, [userId, state.list])

  // Bulk add — returns added/skipped counts so callers can show "Added 4 to grocery list ✓".
  // Skip duplicates client-side: any (list_id, lowercased ingredient_name) already in the
  // active list is dropped. The active list is the only place with item identity, so we
  // only need to dedupe within it.
  const addToList = useCallback(
    async (incoming: AddToListInput[]): Promise<AddToListResult> => {
      if (!userId) return { ok: false, error: 'Not signed in' }
      if (incoming.length === 0) return { ok: true, added: 0, skipped: 0 }

      const ensured = await ensureList()
      if (!ensured.ok) return ensured
      const listId = ensured.listId

      const { data: existingRows, error: existingErr } = await supabase
        .from('grocery_items')
        .select('ingredient_name')
        .eq('list_id', listId)
      if (existingErr) return { ok: false, error: existingErr.message }
      const existingNames = new Set(
        (existingRows ?? []).map((r: any) => String(r.ingredient_name).toLowerCase().trim()),
      )

      const seen = new Set<string>()
      const fresh: AddToListInput[] = []
      for (const item of incoming) {
        const key = item.ingredient_name.toLowerCase().trim()
        if (!key) continue
        if (existingNames.has(key) || seen.has(key)) continue
        seen.add(key)
        fresh.push({ ...item, ingredient_name: key })
      }

      if (fresh.length === 0) {
        return { ok: true, added: 0, skipped: incoming.length }
      }

      const baseSort = state.items.length
      const insertRows = fresh.map((item, i) => ({
        list_id: listId,
        ingredient_name: item.ingredient_name,
        quantity: item.quantity ?? null,
        source_recipe_id: item.source_recipe_id ?? null,
        sort_order: baseSort + i,
      }))
      const { error: insertErr } = await supabase.from('grocery_items').insert(insertRows)
      if (insertErr) return { ok: false, error: insertErr.message }

      await load('refresh')
      return { ok: true, added: fresh.length, skipped: incoming.length - fresh.length }
    },
    [userId, ensureList, state.items.length, load],
  )

  const toggleChecked = useCallback(
    async (itemId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      // Optimistic toggle — UI updates immediately, server write follows.
      const prev = state.items
      const item = prev.find((i) => i.id === itemId)
      if (!item) return { ok: false, error: 'Item not found' }
      const nextChecked = !item.is_checked
      setState((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === itemId ? { ...i, is_checked: nextChecked } : i)),
      }))
      const { error } = await supabase
        .from('grocery_items')
        .update({ is_checked: nextChecked })
        .eq('id', itemId)
      if (error) {
        setState((s) => ({ ...s, items: prev }))
        return { ok: false, error: error.message }
      }
      return { ok: true }
    },
    [state.items],
  )

  const clearCompleted = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!state.list) return { ok: true }
    const { id: listId } = state.list
    const checkedIds = state.items.filter((i) => i.is_checked).map((i) => i.id)
    if (checkedIds.length === 0) return { ok: true }

    // Two paths depending on how much got checked off:
    //   - All items checked → archive the whole list (set completed_at). Next add lazily creates a fresh one.
    //   - Some checked → just delete the checked items, list stays open.
    const allChecked = state.items.length === checkedIds.length
    if (allChecked) {
      const { error } = await supabase
        .from('grocery_lists')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', listId)
      if (error) return { ok: false, error: error.message }
      setState({ list: null, items: [], loading: false, refreshing: false, error: null })
      return { ok: true }
    }
    const { error } = await supabase.from('grocery_items').delete().in('id', checkedIds)
    if (error) return { ok: false, error: error.message }
    setState((s) => ({ ...s, items: s.items.filter((i) => !i.is_checked) }))
    return { ok: true }
  }, [state.list, state.items])

  const checkedCount = state.items.filter((i) => i.is_checked).length

  return {
    list: state.list,
    items: state.items,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    refresh,
    addToList,
    toggleChecked,
    clearCompleted,
    checkedCount,
  }
}
