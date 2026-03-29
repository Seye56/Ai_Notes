import { create } from 'zustand'
import { authApi, extractErrorMessage, getApiAccessToken, setApiAccessToken } from '../services/api'

export const useUserStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  token: getApiAccessToken(),
  initialized: false,
  loading: false,
  error: null,

  hydrateSession: async () => {
    const token = getApiAccessToken()
    if (!token) {
      set({ initialized: true, token: '' })
      return
    }

    set({ loading: true, error: null, token })
    try {
      const profile = await authApi.me()
      set({
        profile,
        user: { id: profile.id, email: profile.email },
        initialized: true,
        loading: false,
      })
    } catch (error) {
      setApiAccessToken('')
      set({
        user: null,
        profile: null,
        session: null,
        token: '',
        initialized: true,
        loading: false,
        error: extractErrorMessage(error),
      })
    }
  },

  signup: async (payload) => {
    set({ loading: true, error: null })
    try {
      const result = await authApi.signup(payload)
      set({ loading: false })
      return result
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to create account.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  login: async (payload) => {
    set({ loading: true, error: null })
    try {
      const result = await authApi.login(payload)
      const token = result?.session?.access_token ?? ''
      setApiAccessToken(token)

      let profile = result.profile
      if (!profile && token) {
        const bootstrap = await authApi.bootstrap()
        profile = bootstrap.profile
      }

      set({
        loading: false,
        token,
        session: result.session ?? null,
        user: { id: result.user_id, email: result.email },
        profile,
        initialized: true,
      })
      return result
    } catch (error) {
      setApiAccessToken('')
      const message = extractErrorMessage(error, 'Unable to log in.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  refreshProfile: async () => {
    try {
      const profile = await authApi.me()
      set({
        profile,
        user: { id: profile.id, email: profile.email },
      })
      return profile
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to refresh profile.')
      set({ error: message })
      throw new Error(message)
    }
  },

  updateProfile: async (payload) => {
    set({ loading: true, error: null })
    try {
      const profile = await authApi.updateMe(payload)
      set({
        loading: false,
        profile,
        user: { id: profile.id, email: profile.email },
      })
      return profile
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to update settings.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignore logout transport issues and clear local state anyway.
    }
    setApiAccessToken('')
    set({
      user: null,
      profile: null,
      session: null,
      token: '',
      error: null,
      initialized: true,
      loading: false,
    })
  },
}))
