'use client'

import { create } from 'zustand'

interface AuthState {
  user: string | null
  loading: boolean // initial session check in-flight
  initialized: boolean // first session check completed

  login: (user: string, pass: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (user, pass) => {
    set({ loading: true })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, error: data.error ?? 'Login failed' }
      }
      set({ user: data.user ?? user })
      return { ok: true }
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      set({ user: null })
    }
  },

  refresh: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user ?? null, initialized: true })
      } else {
        set({ user: null, initialized: true })
      }
    } catch {
      set({ user: null, initialized: true })
    } finally {
      set({ loading: false })
    }
  },
}))
