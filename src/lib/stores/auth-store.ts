import { create } from 'zustand'
import { supabase, type User, type Session } from '../supabase'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean

  // Actions
  signUp: (email: string, password: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      initialized: false,

      signUp: async (email: string, password: string) => {
        set({ loading: true })
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          set({ loading: false })
          return { error }
        }

        if (data.user) {
          set({
            user: data.user,
            session: data.session,
            loading: false
          })
        }

        return {}
      },

      signIn: async (email: string, password: string) => {
        set({ loading: true })
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          set({ loading: false })
          return { error }
        }

        if (data.user) {
          set({
            user: data.user,
            session: data.session,
            loading: false
          })
        }

        return {}
      },

      signOut: async () => {
        set({ loading: true })
        await supabase.auth.signOut()
        set({
          user: null,
          session: null,
          loading: false
        })
      },

      initialize: async () => {
        if (get().initialized) return

        set({ loading: true })

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          set({
            user: session.user,
            session,
            loading: false,
            initialized: true
          })
        } else {
          set({
            user: null,
            session: null,
            loading: false,
            initialized: true
          })
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            set({
              user: session.user,
              session,
              loading: false
            })
          } else {
            set({
              user: null,
              session: null,
              loading: false
            })
          }
        })
      },

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session
      })
    }
  )
)
