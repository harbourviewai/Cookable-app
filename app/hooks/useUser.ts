import { useState, useEffect, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type UserProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  subscription_tier: 'free' | 'plus' | 'pro'
  onboarding_completed_at: string | null
}

type UserState = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, subscription_tier, onboarding_completed_at')
    .eq('id', userId)
    .single()
  if (error) {
    console.warn('useUser: could not load profile:', error.message)
    return null
  }
  return data as UserProfile
}

function bumpLastActive(userId: string) {
  // Best-effort heartbeat — failures (offline, transient network) shouldn't surface.
  void supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId)
    .then(({ error }) => {
      if (error) console.warn('useUser: last_active_at bump failed:', error.message)
    })
}

export function useUser(): UserState {
  const [state, setState] = useState<UserState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  })
  const lastBumpedUserId = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function applySession(session: Session | null, bump: boolean) {
      if (cancelled) return
      const user = session?.user ?? null
      if (!user) {
        setState({ session: null, user: null, profile: null, loading: false })
        lastBumpedUserId.current = null
        return
      }
      const profile = await fetchProfile(user.id)
      if (cancelled) return
      setState({ session, user, profile, loading: false })
      if (bump && lastBumpedUserId.current !== user.id) {
        lastBumpedUserId.current = user.id
        bumpLastActive(user.id)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session, true))
      .catch((err) => {
        console.warn('useUser: getSession failed:', err)
        if (!cancelled) {
          setState({ session: null, user: null, profile: null, loading: false })
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED is the periodic heartbeat — re-arm the bump dedupe so it fires again.
      if (event === 'TOKEN_REFRESHED') lastBumpedUserId.current = null
      const shouldBump =
        event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION'
      void applySession(session, shouldBump)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return state
}
