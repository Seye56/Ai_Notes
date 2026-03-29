import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MoreHorizontal, PenLine } from 'lucide-react'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import NoteEditor from '../components/notes/NoteEditor'
import { useNoteStore } from '../store/noteStore'

const NoteView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedNote, fetchNote, updateNote, deleteNote, loading, saving } = useNoteStore()
  const [draft, setDraft] = useState({
    title: '',
    content: '',
    source_language: 'en',
  })
  const [actionsOpen, setActionsOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

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
                placeholder="Untitled Note"
                autoFocus
              />
            ) : (
              <h1 className="text-3xl font-bold text-main">{draft.title || 'Untitled Note'}</h1>
            )}
            <button
              type="button"
              onClick={() => setEditingTitle((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-soft transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}
              aria-label="Edit note title"
            >
              <PenLine size={16} />
            </button>
          </div>
          <p className="text-sm text-muted">Edit your note, then open study mode or quiz mode.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save note'}</Button>
          <div className="relative">
            <Button
              variant="secondary"
              className="h-12 w-12 rounded-full px-0"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label="More note actions"
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
                  Summary
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionsOpen(false)
                    navigate(`/note/${id}/quiz`)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  Quiz
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-500 transition hover:bg-[var(--danger-soft)]"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <NoteEditor note={draft} onChange={updateField} />
    </div>
  )
}

export default NoteView
