import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import NoteImport from '../components/notes/NoteImport'
import NoteList from '../components/notes/NoteList'
import { useNoteStore } from '../store/noteStore'

const NotesPage = () => {
  const navigate = useNavigate()
  const { notes, loading, saving, fetchNotes, importNote, createNote, deleteNote } = useNoteStore()
  const [importOpen, setImportOpen] = useState(false)
  const [importTitle, setImportTitle] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [file, setFile] = useState(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState([])

  useEffect(() => {
    fetchNotes().catch(() => {})
  }, [fetchNotes])

  const handleCreateNote = async () => {
    try {
      const note = await createNote({
        title: 'Untitled Note',
        content: '',
        source_language: 'en',
      })
      navigate(`/note/${note.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleImport = async () => {
    try {
      const note = await importNote({
        pastedText,
        file,
        title: importTitle,
        sourceLanguage,
      })
      toast.success('Note imported successfully.')
      setImportOpen(false)
      setImportTitle('')
      setPastedText('')
      setSourceLanguage('en')
      setFile(null)
      navigate(`/note/${note.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleSelection = (noteId) => {
    setSelectedNotes((current) =>
      current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId]
    )
  }

  const handleOpenImport = () => {
    setActionsOpen(false)
    setImportOpen(true)
  }

  const handleOpenSelectionMode = () => {
    setActionsOpen(false)
    setSelectionMode(true)
  }

  const handleExitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedNotes([])
  }

  const handleDeleteSelected = async () => {
    if (!selectedNotes.length) {
      toast.error('Select at least one note first.')
      return
    }

    const confirmed = window.confirm(`Delete ${selectedNotes.length} selected note${selectedNotes.length > 1 ? 's' : ''}?`)
    if (!confirmed) {
      return
    }

    try {
      await Promise.all(selectedNotes.map((noteId) => deleteNote(noteId)))
      toast.success(`${selectedNotes.length} note${selectedNotes.length > 1 ? 's' : ''} deleted.`)
      handleExitSelectionMode()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">My Notes</h1>
          <p className="text-sm text-muted">Manage imported files, typed notes, and study material in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <>
              <div className="glass-chip rounded-full px-4 py-2 text-sm font-medium text-main">
                {selectedNotes.length} selected
              </div>
              <Button variant="danger" onClick={handleDeleteSelected} disabled={!selectedNotes.length || saving}>
                <Trash2 size={16} />
                Delete selected
              </Button>
              <Button variant="secondary" onClick={handleExitSelectionMode}>
                <X size={16} />
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                className="h-12 w-12 rounded-full px-0"
                onClick={handleCreateNote}
                aria-label="Create note"
              >
                <Plus size={20} />
              </Button>
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
                      onClick={handleOpenImport}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Import note
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenSelectionMode}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Select notes
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading notes..." />
        </div>
      ) : (
        <NoteList
          notes={notes}
          onCreate={handleCreateNote}
          selectable={selectionMode}
          selectedIds={selectedNotes}
          onToggleSelect={toggleSelection}
          onSelect={(note) => navigate(`/note/${note.id}`)}
        />
      )}

      <Modal open={importOpen} title="Import a note" onClose={() => setImportOpen(false)}>
        <NoteImport
          importTitle={importTitle}
          pastedText={pastedText}
          sourceLanguage={sourceLanguage}
          file={file}
          onTitleChange={setImportTitle}
          onTextChange={setPastedText}
          onLanguageChange={setSourceLanguage}
          onFileChange={setFile}
          onSubmit={handleImport}
          busy={saving}
        />
      </Modal>
    </div>
  )
}

export default NotesPage
