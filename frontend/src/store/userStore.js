import { create } from 'zustand'
import { authApi, extractErrorMessage, getApiAccessToken, setApiAccessToken } from '../services/api'

const getHabitStorageKey = (userId) => `ai_notes_habit_tracker:${userId}`

const toDayStamp = (value = new Date()) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseHabitData = (userId) => {
  if (!userId) {
    return {
      totalLogins: 0,
      recentDates: [],
      streak: 0,
      lastLoginAt: null,
    }
  }

  const raw = localStorage.getItem(getHabitStorageKey(userId))
  if (!raw) {
    return {
      totalLogins: 0,
      recentDates: [],
      streak: 0,
      lastLoginAt: null,
    }
  }

  try {
    const parsed = JSON.parse(raw)
    const recentDates = Array.isArray(parsed.recentDates) ? parsed.recentDates : []
    return {
      totalLogins: parsed.totalLogins ?? 0,
      recentDates,
      streak: calculateStreak(recentDates),
      lastLoginAt: parsed.lastLoginAt ?? null,
    }
  } catch {
    return {
      totalLogins: 0,
      recentDates: [],
      streak: 0,
      lastLoginAt: null,
    }
  }
}

const calculateStreak = (recentDates) => {
  if (!recentDates.length) {
    return 0
  }

  const sorted = [...new Set(recentDates)].sort((left, right) => new Date(right) - new Date(left))
  let streak = 1
  for (let index = 1; index < sorted.length; index += 1) {
    const previousDate = new Date(sorted[index - 1])
    const nextExpectedDate = new Date(previousDate)
    nextExpectedDate.setDate(previousDate.getDate() - 1)
    const currentDate = new Date(sorted[index])

    if (toDayStamp(currentDate) !== toDayStamp(nextExpectedDate)) {
      break
    }
    streak += 1
  }
  return streak
}

const recordLoginHabit = (userId) => {
  const existing = parseHabitData(userId)
  const today = toDayStamp()
  const uniqueDates = Array.from(new Set([today, ...existing.recentDates]))
    .sort((left, right) => new Date(right) - new Date(left))
    .slice(0, 14)

  const next = {
    totalLogins: existing.totalLogins + 1,
    recentDates: uniqueDates,
    lastLoginAt: new Date().toISOString(),
  }
  localStorage.setItem(getHabitStorageKey(userId), JSON.stringify(next))
  return {
    ...next,
    streak: calculateStreak(uniqueDates),
  }
}

export const useUserStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  token: getApiAccessToken(),
  habitStats: {
    totalLogins: 0,
    recentDates: [],
    streak: 0,
    lastLoginAt: null,
  },
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
        habitStats: parseHabitData(profile.id),
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
        habitStats: recordLoginHabit(result.user_id),
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
        habitStats: parseHabitData(profile.id),
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
        habitStats: parseHabitData(profile.id),
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
      habitStats: {
        totalLogins: 0,
        recentDates: [],
        streak: 0,
        lastLoginAt: null,
      },
      error: null,
      initialized: true,
      loading: false,
    })
  },
}))
