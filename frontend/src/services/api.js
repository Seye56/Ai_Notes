import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

let accessToken = localStorage.getItem('ai_notes_access_token') ?? ''

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

export const setApiAccessToken = (token) => {
  accessToken = token ?? ''
  if (accessToken) {
    localStorage.setItem('ai_notes_access_token', accessToken)
  } else {
    localStorage.removeItem('ai_notes_access_token')
  }
}

export const getApiAccessToken = () => accessToken

export const extractErrorMessage = (error, fallback = 'Something went wrong.') => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  )
}

export const authApi = {
  signup: async (payload) => {
    const response = await api.post('/auth/signup', payload)
    return response.data
  },
  login: async (payload) => {
    const response = await api.post('/auth/login', payload)
    return response.data
  },
  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  },
  bootstrap: async () => {
    const response = await api.post('/auth/bootstrap')
    return response.data
  },
  me: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
  updateMe: async (payload) => {
    const response = await api.patch('/auth/me', payload)
    return response.data
  },
}

export const notesApi = {
  list: async () => {
    const response = await api.get('/notes')
    return response.data
  },
  get: async (id) => {
    const response = await api.get(`/notes/${id}`)
    return response.data
  },
  create: async (payload) => {
    const response = await api.post('/notes', payload)
    return response.data
  },
  update: async (id, payload) => {
    const response = await api.patch(`/notes/${id}`, payload)
    return response.data
  },
  remove: async (id) => {
    await api.delete(`/notes/${id}`)
  },
  import: async ({ pastedText, file, title, sourceLanguage }) => {
    const formData = new FormData()
    if (pastedText) {
      formData.append('pasted_text', pastedText)
    }
    if (file) {
      formData.append('file', file)
    }
    if (title) {
      formData.append('title', title)
    }
    if (sourceLanguage) {
      formData.append('source_language', sourceLanguage)
    }
    const response = await api.post('/notes/impor', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}

export const aiApi = {
  summarize: async (noteId, payload) => {
    const response = await api.post(`/notes/${noteId}/summarize`, payload)
    return response.data
  },
  translate: async (noteId, payload) => {
    const response = await api.post(`/notes/${noteId}/translate`, payload)
    return response.data
  },
  quiz: async (noteId, payload) => {
    const response = await api.post(`/notes/${noteId}/quiz`, payload)
    return response.data
  },
  translateText: async (payload) => {
    const response = await api.post('/translations/text', payload)
    return response.data
  },
}

export const speechApi = {
  voices: async () => {
    const response = await api.get('/speech/voices')
    return response.data
  },
  moods: async () => {
    const response = await api.get('/speech/moods')
    return response.data
  },
  generate: async (payload) => {
    const response = await api.post('/speech/generate', payload)
    return response.data
  },
  speakQuiz: async (quizId, payload) => {
    const response = await api.post(`/quizzes/${quizId}/speak`, payload)
    return response.data
  },
}

export const groupsApi = {
  list: async () => {
    const response = await api.get('/groups')
    return response.data
  },
  create: async (payload) => {
    const response = await api.post('/groups', payload)
    return response.data
  },
  listMembers: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/members`)
    return response.data
  },
  addMember: async (groupId, payload) => {
    const response = await api.post(`/groups/${groupId}/members`, payload)
    return response.data
  },
  removeMember: async (groupId, userId) => {
    await api.delete(`/groups/${groupId}/members/${userId}`)
  },
  listEvents: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/events`)
    return response.data
  },
  createEvent: async (groupId, payload) => {
    const response = await api.post(`/groups/${groupId}/events`, payload)
    return response.data
  },
  listPresence: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/presence`)
    return response.data
  },
  updatePresence: async (groupId, payload) => {
    const response = await api.put(`/groups/${groupId}/presence`, payload)
    return response.data
  },
  clearPresence: async (groupId) => {
    await api.delete(`/groups/${groupId}/presence`)
  },
}

export const buildGroupSocketUrl = ({ groupId, token, language }) => {
  const baseUrl = API_BASE_URL.replace(/^http/, 'ws')
  const params = new URLSearchParams()
  if (token) {
    params.set('token', token)
  }
  if (language) {
    params.set('language', language)
  }
  return `${baseUrl}/groups/${groupId}/ws?${params.toString()}`
}
