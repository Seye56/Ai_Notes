import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mic, MoreHorizontal, PenLine } from 'lucide-react'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import NoteEditor from '../components/notes/NoteEditor'
import { useNoteStore } from '../store/noteStore'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'
import { createTranslator } from '../utils/appText'
import { getLanguageLabel, languageOptions } from '../utils/languageMap'

const NoteView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useUserStore()
  const t = createTranslator(profile?.preferred_language)
  const { selectedNote, fetchNote, updateNote, deleteNote, createTranslatedNote, loading, saving } = useNoteStore()
  const { generateSpeech } = useStudyStore()
  const [draft, setDraft] = useState({
    title: '',
    content: '',
    source_language: 'en',
  })
  const [actionsOpen, setActionsOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [translateOpen, setTranslateOpen] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState(profile?.preferred_language || 'fr')
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [playingAudio, setPlayingAudio] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    fetchNote(id).catch((error) => toast.error(error.message))
  }, [fetchNote, id])

  useEffect(() => {
    if (selectedNote?.id === id) {
      setDraft({
        title: selectedNote.title,
        content: selectedNote.content,
        source_language: selectedNote.source_language,
      })
      setEditingTitle(false)
    }
  }, [id, selectedNote])

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    try {
      await updateNote(id, draft)
      toast.success('Note saved.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteNote(id)
      toast.success('Note deleted.')
      setActionsOpen(false)
      navigate('/notes')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleTranslate = async () => {
    try {
      const languageLabel = getLanguageLabel(targetLanguage)
      const translatedNote = await createTranslatedNote({
        noteId: id,
        title: `${languageLabel}-${draft.title || t('untitled_note')}`,
        targetLanguage: languageLabel,
        targetLanguageCode: targetLanguage,
      })
      setTranslateOpen(false)
      setActionsOpen(false)
      toast.success('Translated note created.')
      navigate(`/note/${translatedNote.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleReadAloud = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setLoadingAudio(true)
      const audio = await generateSpeech({
        source_type: 'note',
        source_id: id,
        source_language: draft.source_language,
        gender: 'female',
        mood: 'narration',
        language: draft.source_language || 'en',
      })

      const player = new Audio(audio.public_url)
      audioRef.current = player
      player.onended = () => setPlayingAudio(false)
      player.onerror = () => setPlayingAudio(false)
      await player.play()
      setPlayingAudio(true)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoadingAudio(false)
    }
  }

  if (loading && !selectedNote) {
    return (
      <div className="panel rounded-[28px] p-6">
        <Loader label="Loading note..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {editingTitle ? (
              <input
                type="text"
                value={draft.title}
                onChange={(event) => updateField('title', event.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setEditingTitle(false)
                  }
                }}
                className="input-field max-w-xl text-2xl font-bold"
                placeholder={t('untitled_note')}
                autoFocus
              />
            ) : (
              <h1 className="text-3xl font-bold text-main">{draft.title || t('untitled_note')}</h1>
            )}
            <button
              type="button"
              onClick={() => setEditingTitle((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-soft transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}
              aria-label={t('edit_note_title')}
            >
              <PenLine size={16} />
            </button>
          </div>
          <p className="text-sm text-muted">{t('edit_your_note')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReadAloud}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full border transition ${loadingAudio || playingAudio ? 'bg-[var(--accent)] text-white shadow-lg shadow-purple-300/40' : 'bg-[var(--surface)] text-[var(--accent-strong)]'}`}
            style={{ borderColor: loadingAudio || playingAudio ? 'var(--accent)' : 'var(--border-soft)' }}
            aria-label="Read note aloud"
            disabled={loadingAudio}
          >
            <Mic size={18} />
          </button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t('saving') : t('save_note')}</Button>
          <div className="relative">
            <Button
              variant="secondary"
              className="h-12 w-12 rounded-full px-0"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label={t('more_note_actions')}
            >
              <MoreHorizontal size={18} />
            </Button>
            {actionsOpen ? (
              <div className="panel absolute right-0 top-14 z-20 flex min-w-[12rem] flex-col rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    navigate(`/note/${id}/study`)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  {t('summary')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    navigate(`/note/${id}/quiz`)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  {t('quiz')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    setTranslateOpen(true)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  Translate
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-500 transition hover:bg-[var(--danger-soft)]"
                >
                  {t('delete')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <NoteEditor note={draft} onChange={updateField} />

      <Modal open={translateOpen} title="Translate note" onClose={() => setTranslateOpen(false)}>
        <div className="space-y-4">
          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="select-field text-sm"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button onClick={handleTranslate} disabled={saving}>
            Create translated note
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default NoteView
