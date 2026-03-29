import { create } from 'zustand'
import { extractErrorMessage, notesApi } from '../services/api'

export const useNoteStore = create((set, get) => ({
  notes: [],
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
      set((state) => ({
        notes: state.notes.filter((item) => item.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
        saving: false,
      }))
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

  setSelectedNote: (note) => set({ selectedNote: note }),
  clearSelectedNote: () => set({ selectedNote: null }),
}))
