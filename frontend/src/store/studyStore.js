import { create } from 'zustand'
import { aiApi, buildGroupSocketUrl, extractErrorMessage, getApiAccessToken, groupsApi, speechApi } from '../services/api'

const getSummaryStorageKey = (userId) => `ai_notes_summaries:${userId}`
const getQuizStorageKey = (userId) => `ai_notes_quizzes:${userId}`

const parseSummaries = (userId) => {
  if (!userId) {
    return []
  }

  const raw = localStorage.getItem(getSummaryStorageKey(userId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const persistSummaries = (userId, summaries) => {
  if (!userId) {
    return
  }
  localStorage.setItem(getSummaryStorageKey(userId), JSON.stringify(summaries))
}

const parseQuizzes = (userId) => {
  if (!userId) {
    return []
  }

  const raw = localStorage.getItem(getQuizStorageKey(userId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const persistQuizzes = (userId, quizzes) => {
  if (!userId) {
    return
  }
  localStorage.setItem(getQuizStorageKey(userId), JSON.stringify(quizzes))
}

export const useStudyStore = create((set, get) => ({
  summary: null,
  summaries: [],
  translation: null,
  quiz: null,
  quizzes: [],
  audio: null,
  voices: [],
  moods: [],
  groups: [],
  groupMembers: [],
  groupEvents: [],
  groupPresence: [],
  activeGroup: null,
  socketStatus: 'idle',
  socketLanguage: 'en',
  loading: false,
  error: null,
  socket: null,

  initializeSpeechOptions: async () => {
    try {
      const [voices, moods] = await Promise.all([speechApi.voices(), speechApi.moods()])
      set({ voices, moods })
    } catch (error) {
      set({ error: extractErrorMessage(error, 'Unable to load speech options.') })
    }
  },

  hydrateSummaries: (userId) => {
    const summaries = parseSummaries(userId)
    set({ summaries })
    return summaries
  },

  hydrateQuizzes: (userId) => {
    const quizzes = parseQuizzes(userId)
    set({ quizzes })
    return quizzes
  },

  summarizeNote: async (noteId, payload) => {
    set({ loading: true, error: null })
    try {
      const summary = await aiApi.summarize(noteId, payload)
      set({ summary, loading: false })
      return summary
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to summarize note.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  summarizeAndStore: async ({ userId, note, folderName = null }) => {
    set({ loading: true, error: null })
    try {
      const summary = await aiApi.summarize(note.id, {})
      const entry = {
        id: summary.id,
        note_id: note.id,
        note_title: note.title,
        summary_text: summary.summary_text,
        model_used: summary.model_used,
        created_at: summary.created_at,
        source_language: note.source_language,
        folder_name: folderName,
      }

      const existing = parseSummaries(userId).filter((item) => item.note_id !== note.id)
      const next = [entry, ...existing].sort(
        (left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
      )

      persistSummaries(userId, next)
      set({ summary, summaries: next, loading: false })
      return entry
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to summarize note.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  translateNote: async (noteId, payload) => {
    set({ loading: true, error: null })
    try {
      const translation = await aiApi.translate(noteId, payload)
      set({ translation, loading: false })
      return translation
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to translate note.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  generateQuiz: async (noteId, payload) => {
    set({ loading: true, error: null })
    try {
      const quiz = await aiApi.quiz(noteId, payload)
      set({ quiz, loading: false })
      return quiz
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to generate quiz.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  generateAndStoreQuiz: async ({ userId, note, folderName = null, payload }) => {
    set({ loading: true, error: null })
    try {
      const quiz = await aiApi.quiz(note.id, payload)
      const entry = {
        id: quiz.id,
        note_id: note.id,
        note_title: note.title,
        questions_json: quiz.questions_json,
        difficulty: quiz.difficulty,
        created_at: quiz.created_at,
        source_language: note.source_language,
        folder_name: folderName,
      }

      const existing = parseQuizzes(userId).filter((item) => item.note_id !== note.id)
      const next = [entry, ...existing].sort(
        (left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
      )

      persistQuizzes(userId, next)
      set({ quiz, quizzes: next, loading: false })
      return entry
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to generate quiz.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  generateSpeech: async (payload) => {
    set({ loading: true, error: null })
    try {
      const audio = payload.quizId
        ? await speechApi.speakQuiz(payload.quizId, payload)
        : await speechApi.generate(payload)
      set({ audio, loading: false })
      return audio
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to generate audio.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  fetchGroups: async () => {
    set({ loading: true, error: null })
    try {
      const groups = await groupsApi.list()
      set({ groups, loading: false })
      return groups
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to load groups.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  createGroup: async (payload) => {
    set({ loading: true, error: null })
    try {
      const group = await groupsApi.create(payload)
      set((state) => ({
        groups: [group, ...state.groups],
        activeGroup: group,
        loading: false,
      }))
      return group
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to create group.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  selectGroup: async (group) => {
    set({ activeGroup: group, error: null })
    if (!group) {
      return
    }
    try {
      const [members, events, presence] = await Promise.all([
        groupsApi.listMembers(group.id),
        groupsApi.listEvents(group.id),
        groupsApi.listPresence(group.id),
      ])
      set({ groupMembers: members, groupEvents: events, groupPresence: presence })
    } catch (error) {
      set({ error: extractErrorMessage(error, 'Unable to load group details.') })
    }
  },

  addGroupMember: async (groupId, payload) => {
    const member = await groupsApi.addMember(groupId, payload)
    set((state) => ({ groupMembers: [...state.groupMembers, member] }))
    return member
  },

  removeGroupMember: async (groupId, userId) => {
    await groupsApi.removeMember(groupId, userId)
    set((state) => ({
      groupMembers: state.groupMembers.filter((member) => member.user_id !== userId),
    }))
  },

  createGroupEvent: async (groupId, payload) => {
    const event = await groupsApi.createEvent(groupId, payload)
    set((state) => ({ groupEvents: [...state.groupEvents, event] }))
    return event
  },

  updatePresence: async (groupId, payload) => {
    const presence = await groupsApi.updatePresence(groupId, payload)
    set((state) => ({
      groupPresence: upsertByUserId(state.groupPresence, presence),
    }))
    return presence
  },

  connectGroupSocket: ({ groupId, language = 'en', onMessage }) => {
    const existingSocket = get().socket
    if (existingSocket) {
      existingSocket.close()
    }

    const token = getApiAccessToken()
    const url = buildGroupSocketUrl({ groupId, token, language })
    const socket = new WebSocket(url)

    socket.onopen = () => {
      set({ socketStatus: 'connected', socketLanguage: language })
    }

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      if (payload.type === 'presence_snapshot') {
        set({ groupPresence: payload.presences ?? [] })
      }
      if (payload.type === 'presence_update') {
        set((state) => ({
          groupPresence: upsertByUserId(state.groupPresence, payload.presence),
        }))
      }
      if (payload.type === 'presence_removed') {
        set((state) => ({
          groupPresence: state.groupPresence.filter((presence) => presence.user_id !== payload.user_id),
        }))
      }
      if (payload.type === 'group_note_event') {
        set((state) => ({
          groupEvents: [...state.groupEvents, payload],
        }))
      }
      onMessage?.(payload)
    }

    socket.onerror = () => {
      set({ socketStatus: 'error' })
    }

    socket.onclose = () => {
      set({ socketStatus: 'disconnected', socket: null })
    }

    set({ socket, socketStatus: 'connecting', socketLanguage: language })
    return socket
  },

  sendSocketEvent: (payload) => {
    const socket = get().socket
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  },

  disconnectGroupSocket: () => {
    const socket = get().socket
    if (socket) {
      socket.close()
    }
    set({ socket: null, socketStatus: 'idle' })
  },
}))

const upsertByUserId = (items, incoming) => {
  const next = items.filter((item) => item.user_id !== incoming.user_id)
  return [...next, incoming].sort((left, right) => {
    const leftDate = new Date(left.updated_at ?? 0).getTime()
    const rightDate = new Date(right.updated_at ?? 0).getTime()
    return rightDate - leftDate
  })
}
