import { create } from 'zustand'
import { aiApi, buildGroupSocketUrl, extractErrorMessage, getApiAccessToken, groupsApi, speechApi } from '../services/api'

const getSummaryStorageKey = (userId) => `ai_notes_summaries:${userId}`
const getQuizStorageKey = (userId) => `ai_notes_quizzes:${userId}`
const getSummaryFolderStorageKey = (userId) => `ai_notes_summary_folders:${userId}`
const getQuizFolderStorageKey = (userId) => `ai_notes_quiz_folders:${userId}`

const parseCollection = (storageKey) => {
  const raw = localStorage.getItem(storageKey)
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

const persistCollection = (storageKey, value) => {
  localStorage.setItem(storageKey, JSON.stringify(value))
}

const parseFolders = (storageKey) => {
  return parseCollection(storageKey)
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      itemIds: Array.isArray(folder.itemIds) ? folder.itemIds : [],
      createdAt: folder.createdAt ?? new Date().toISOString(),
    }))
    .filter((folder) => folder.id && folder.name)
}

const parseSummaries = (userId) => {
  if (!userId) {
    return []
  }
  return parseCollection(getSummaryStorageKey(userId))
}

const persistSummaries = (userId, summaries) => {
  if (!userId) {
    return
  }
  persistCollection(getSummaryStorageKey(userId), summaries)
}

const parseQuizzes = (userId) => {
  if (!userId) {
    return []
  }
  return parseCollection(getQuizStorageKey(userId))
}

const persistQuizzes = (userId, quizzes) => {
  if (!userId) {
    return
  }
  persistCollection(getQuizStorageKey(userId), quizzes)
}

const parseSummaryFolders = (userId) => {
  if (!userId) {
    return []
  }
  return parseFolders(getSummaryFolderStorageKey(userId))
}

const persistSummaryFolders = (userId, folders) => {
  if (!userId) {
    return
  }
  persistCollection(getSummaryFolderStorageKey(userId), folders)
}

const parseQuizFolders = (userId) => {
  if (!userId) {
    return []
  }
  return parseFolders(getQuizFolderStorageKey(userId))
}

const persistQuizFolders = (userId, folders) => {
  if (!userId) {
    return
  }
  persistCollection(getQuizFolderStorageKey(userId), folders)
}

export const useStudyStore = create((set, get) => ({
  summary: null,
  summaries: [],
  summaryFolders: [],
  translation: null,
  quiz: null,
  quizzes: [],
  quizFolders: [],
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

  hydrateSummaryFolders: (userId) => {
    const folders = parseSummaryFolders(userId)
    set({ summaryFolders: folders })
    return folders
  },

  hydrateQuizzes: (userId) => {
    const quizzes = parseQuizzes(userId)
    set({ quizzes })
    return quizzes
  },

  hydrateQuizFolders: (userId) => {
    const folders = parseQuizFolders(userId)
    set({ quizFolders: folders })
    return folders
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
        translated_language: null,
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
        translated_language: null,
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

  createSummaryFolder: (userId, name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Folder name is required.')
    }

    const existing = parseSummaryFolders(userId)
    if (existing.some((folder) => folder.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error('A folder with that name already exists.')
    }

    const nextFolders = [
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        itemIds: [],
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ]

    persistSummaryFolders(userId, nextFolders)
    set({ summaryFolders: nextFolders })
    return nextFolders[0]
  },

  createQuizFolder: (userId, name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Folder name is required.')
    }

    const existing = parseQuizFolders(userId)
    if (existing.some((folder) => folder.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error('A folder with that name already exists.')
    }

    const nextFolders = [
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        itemIds: [],
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ]

    persistQuizFolders(userId, nextFolders)
    set({ quizFolders: nextFolders })
    return nextFolders[0]
  },

  moveSummariesToFolder: (userId, summaryIds, folderId) => {
    const existing = parseSummaryFolders(userId)
    const idSet = new Set(summaryIds)
    const clearedFolders = existing.map((folder) => ({
      ...folder,
      itemIds: folder.itemIds.filter((itemId) => !idSet.has(itemId)),
    }))

    const nextFolders = folderId
      ? clearedFolders.map((folder) =>
          folder.id === folderId
            ? { ...folder, itemIds: Array.from(new Set([...folder.itemIds, ...summaryIds])) }
            : folder
        )
      : clearedFolders

    persistSummaryFolders(userId, nextFolders)
    set({ summaryFolders: nextFolders })
    return nextFolders
  },

  moveQuizzesToFolder: (userId, quizIds, folderId) => {
    const existing = parseQuizFolders(userId)
    const idSet = new Set(quizIds)
    const clearedFolders = existing.map((folder) => ({
      ...folder,
      itemIds: folder.itemIds.filter((itemId) => !idSet.has(itemId)),
    }))

    const nextFolders = folderId
      ? clearedFolders.map((folder) =>
          folder.id === folderId
            ? { ...folder, itemIds: Array.from(new Set([...folder.itemIds, ...quizIds])) }
            : folder
        )
      : clearedFolders

    persistQuizFolders(userId, nextFolders)
    set({ quizFolders: nextFolders })
    return nextFolders
  },

  deleteSummaryDocument: (userId, summaryId) => {
    const nextSummaries = parseSummaries(userId).filter((item) => item.id !== summaryId)
    const nextFolders = parseSummaryFolders(userId).map((folder) => ({
      ...folder,
      itemIds: folder.itemIds.filter((itemId) => itemId !== summaryId),
    }))
    persistSummaries(userId, nextSummaries)
    persistSummaryFolders(userId, nextFolders)
    set({ summaries: nextSummaries, summaryFolders: nextFolders })
  },

  deleteQuizDocument: (userId, quizId) => {
    const nextQuizzes = parseQuizzes(userId).filter((item) => item.id !== quizId)
    const nextFolders = parseQuizFolders(userId).map((folder) => ({
      ...folder,
      itemIds: folder.itemIds.filter((itemId) => itemId !== quizId),
    }))
    persistQuizzes(userId, nextQuizzes)
    persistQuizFolders(userId, nextFolders)
    set({ quizzes: nextQuizzes, quizFolders: nextFolders })
  },

  deleteSummaryFolder: (userId, folderId, strategy = 'move') => {
    const existing = parseSummaryFolders(userId)
    const folder = existing.find((item) => item.id === folderId)

    if (!folder) {
      throw new Error('Folder not found.')
    }

    if (strategy === 'delete') {
      folder.itemIds.forEach((summaryId) => get().deleteSummaryDocument(userId, summaryId))
    }

    const nextFolders = parseSummaryFolders(userId).filter((item) => item.id !== folderId)
    persistSummaryFolders(userId, nextFolders)
    set({ summaryFolders: nextFolders })
  },

  deleteQuizFolder: (userId, folderId, strategy = 'move') => {
    const existing = parseQuizFolders(userId)
    const folder = existing.find((item) => item.id === folderId)

    if (!folder) {
      throw new Error('Folder not found.')
    }

    if (strategy === 'delete') {
      folder.itemIds.forEach((quizId) => get().deleteQuizDocument(userId, quizId))
    }

    const nextFolders = parseQuizFolders(userId).filter((item) => item.id !== folderId)
    persistQuizFolders(userId, nextFolders)
    set({ quizFolders: nextFolders })
  },

  translateSummaryDocument: async ({ userId, summary, targetLanguage, folderName = null }) => {
    set({ loading: true, error: null })
    try {
      const translation = await aiApi.translateText({
        text: summary.summary_text,
        source_language: summary.translated_language || summary.source_language,
        target_language: targetLanguage,
        translation_type: 'text',
      })

      const entry = {
        ...summary,
        id: crypto.randomUUID(),
        note_title: `${targetLanguage}-${summary.note_title}`,
        summary_text: translation.translated_text,
        created_at: new Date().toISOString(),
        translated_language: targetLanguage,
        folder_name: folderName,
      }

      const next = [entry, ...parseSummaries(userId)].sort(
        (left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
      )
      persistSummaries(userId, next)
      set({ summaries: next, loading: false })
      return entry
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to translate summary.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  translateQuizDocument: async ({ userId, quiz, targetLanguage, folderName = null }) => {
    set({ loading: true, error: null })
    try {
      const translatedQuestions = await Promise.all(
        quiz.questions_json.map(async (question) => {
          const [translatedQuestion, translatedAnswer, translatedExplanation, translatedOptions] = await Promise.all([
            aiApi.translateText({
              text: question.question,
              source_language: quiz.translated_language || quiz.source_language,
              target_language: targetLanguage,
              translation_type: 'text',
            }),
            question.answer
              ? aiApi.translateText({
                  text: question.answer,
                  source_language: quiz.translated_language || quiz.source_language,
                  target_language: targetLanguage,
                  translation_type: 'text',
                })
              : Promise.resolve({ translated_text: '' }),
            question.explanation
              ? aiApi.translateText({
                  text: question.explanation,
                  source_language: quiz.translated_language || quiz.source_language,
                  target_language: targetLanguage,
                  translation_type: 'text',
                })
              : Promise.resolve({ translated_text: '' }),
            Promise.all(
              question.options.map((option) =>
                aiApi.translateText({
                  text: option,
                  source_language: quiz.translated_language || quiz.source_language,
                  target_language: targetLanguage,
                  translation_type: 'text',
                })
              )
            ),
          ])

          return {
            ...question,
            question: translatedQuestion.translated_text,
            answer: translatedAnswer.translated_text || question.answer,
            explanation: translatedExplanation.translated_text || question.explanation,
            options: translatedOptions.map((option) => option.translated_text),
          }
        })
      )

      const entry = {
        ...quiz,
        id: crypto.randomUUID(),
        note_title: `${targetLanguage}-${quiz.note_title}`,
        questions_json: translatedQuestions,
        created_at: new Date().toISOString(),
        translated_language: targetLanguage,
        folder_name: folderName,
      }

      const next = [entry, ...parseQuizzes(userId)].sort(
        (left, right) => new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
      )
      persistQuizzes(userId, next)
      set({ quizzes: next, loading: false })
      return entry
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to translate quiz.')
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
