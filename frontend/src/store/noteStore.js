import { create } from 'zustand'
import { aiApi, extractErrorMessage, notesApi } from '../services/api'

const getFolderStorageKey = (userId) => `ai_notes_folders:${userId}`

const parseFolders = (userId) => {
  if (!userId) {
    return []
  }

  const raw = localStorage.getItem(getFolderStorageKey(userId))
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map((folder) => ({
        id: folder.id,
        name: folder.name,
        noteIds: Array.isArray(folder.noteIds) ? folder.noteIds : [],
        createdAt: folder.createdAt ?? new Date().toISOString(),
      }))
      .filter((folder) => folder.id && folder.name)
  } catch {
    return []
  }
}

const persistFolders = (userId, folders) => {
  if (!userId) {
    return
  }
  localStorage.setItem(getFolderStorageKey(userId), JSON.stringify(folders))
}

export const useNoteStore = create((set, get) => ({
  notes: [],
  folders: [],
  selectedNote: null,
  loading: false,
  saving: false,
  error: null,

  fetchNotes: async () => {
    set({ loading: true, error: null })
    try {
      const notes = await notesApi.list()
      set({ notes, loading: false })
      return notes
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to load notes.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  fetchNote: async (id) => {
    set({ loading: true, error: null })
    try {
      const note = await notesApi.get(id)
      set((state) => ({
        selectedNote: note,
        loading: false,
        notes: state.notes.some((item) => item.id === note.id)
          ? state.notes.map((item) => (item.id === note.id ? note : item))
          : [note, ...state.notes],
      }))
      return note
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to load note.')
      set({ loading: false, error: message })
      throw new Error(message)
    }
  },

  createNote: async (payload) => {
    set({ saving: true, error: null })
    try {
      const note = await notesApi.create(payload)
      set((state) => ({
        notes: [note, ...state.notes],
        selectedNote: note,
        saving: false,
      }))
      return note
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to create note.')
      set({ saving: false, error: message })
      throw new Error(message)
    }
  },

  updateNote: async (id, payload) => {
    set({ saving: true, error: null })
    try {
      const note = await notesApi.update(id, payload)
      set((state) => ({
        selectedNote: note,
        notes: state.notes.map((item) => (item.id === note.id ? note : item)),
        saving: false,
      }))
      return note
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to save note.')
      set({ saving: false, error: message })
      throw new Error(message)
    }
  },

  deleteNote: async (id) => {
    set({ saving: true, error: null })
    try {
      await notesApi.remove(id)
      const nextFolders = get().folders.map((folder) => ({
        ...folder,
        noteIds: folder.noteIds.filter((noteId) => noteId !== id),
      }))
      set((state) => ({
        notes: state.notes.filter((item) => item.id !== id),
        folders: nextFolders,
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
        saving: false,
      }))

      const userId = localStorage.getItem('ai_notes_last_user_id')
      if (userId) {
        persistFolders(userId, nextFolders)
      }
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to delete note.')
      set({ saving: false, error: message })
      throw new Error(message)
    }
  },

  importNote: async (payload) => {
    set({ saving: true, error: null })
    try {
      const note = await notesApi.import(payload)
      set((state) => ({
        notes: [note, ...state.notes],
        selectedNote: note,
        saving: false,
      }))
      return note
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to import note.')
      set({ saving: false, error: message })
      throw new Error(message)
    }
  },

  createTranslatedNote: async ({ noteId, title, targetLanguage, targetLanguageCode }) => {
    set({ saving: true, error: null })
    try {
      const translation = await aiApi.translate(noteId, {
        target_language: targetLanguage,
        translation_type: 'text',
      })
      const note = await notesApi.create({
        title,
        content: translation.translated_content,
        source_language: targetLanguageCode,
      })
      set((state) => ({
        notes: [note, ...state.notes],
        selectedNote: note,
        saving: false,
      }))
      return note
    } catch (error) {
      const message = extractErrorMessage(error, 'Unable to create translated note.')
      set({ saving: false, error: message })
      throw new Error(message)
    }
  },

  hydrateFolders: (userId) => {
    localStorage.setItem('ai_notes_last_user_id', userId ?? '')
    const folders = parseFolders(userId)
    set({ folders })
    return folders
  },

  createFolder: (userId, name) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Folder name is required.')
    }

    const existing = parseFolders(userId)
    if (existing.some((folder) => folder.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error('A folder with that name already exists.')
    }

    const nextFolders = [
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        noteIds: [],
        createdAt: new Date().toISOString(),
      },
      ...existing,
    ]

    persistFolders(userId, nextFolders)
    set({ folders: nextFolders })
    return nextFolders[0]
  },

  moveNotesToFolder: (userId, noteIds, folderId) => {
    const existing = parseFolders(userId)
    const idSet = new Set(noteIds)
    const clearedFolders = existing.map((folder) => ({
      ...folder,
      noteIds: folder.noteIds.filter((noteId) => !idSet.has(noteId)),
    }))

    const nextFolders = folderId
      ? clearedFolders.map((folder) =>
          folder.id === folderId
            ? { ...folder, noteIds: Array.from(new Set([...folder.noteIds, ...noteIds])) }
            : folder
        )
      : clearedFolders

    persistFolders(userId, nextFolders)
    set({ folders: nextFolders })
    return nextFolders
  },

  deleteFolder: async (userId, folderId, strategy = 'move') => {
    const existing = parseFolders(userId)
    const folder = existing.find((item) => item.id === folderId)

    if (!folder) {
      throw new Error('Folder not found.')
    }

    if (strategy === 'delete') {
      await Promise.all(folder.noteIds.map((noteId) => get().deleteNote(noteId)))
    }

    const nextFolders = existing.filter((item) => item.id !== folderId)
    persistFolders(userId, nextFolders)
    set({ folders: nextFolders })
  },

  setSelectedNote: (note) => set({ selectedNote: note }),
  clearSelectedNote: () => set({ selectedNote: null }),
}))
