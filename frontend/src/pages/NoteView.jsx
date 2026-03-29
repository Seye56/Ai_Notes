import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
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
          <h1 className="text-3xl font-bold text-main">{draft.title || 'Untitled Note'}</h1>
          <p className="text-sm text-muted">Edit your note, then open study mode or quiz mode.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate(`/note/${id}/study`)}>Study tools</Button>
          <Button variant="secondary" onClick={() => navigate(`/note/${id}/quiz`)}>Quiz mode</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save note'}</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <NoteEditor note={draft} onChange={updateField} />
    </div>
  )
}

export default NoteView
