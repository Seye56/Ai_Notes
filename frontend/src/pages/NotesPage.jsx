import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import NoteImport from '../components/notes/NoteImport'
import NoteList from '../components/notes/NoteList'
import { useNoteStore } from '../store/noteStore'

const NotesPage = () => {
  const navigate = useNavigate()
  const { notes, loading, saving, fetchNotes, importNote } = useNoteStore()
  const [importOpen, setImportOpen] = useState(false)
  const [importTitle, setImportTitle] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [file, setFile] = useState(null)

  useEffect(() => {
    fetchNotes().catch(() => {})
  }, [fetchNotes])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">My Notes</h1>
          <p className="text-sm text-muted">Manage imported files, typed notes, and study material in one place.</p>
        </div>
        <Button onClick={() => setImportOpen(true)}>Import note</Button>
      </div>

      {loading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading notes..." />
        </div>
      ) : (
        <NoteList notes={notes} onSelect={(note) => navigate(`/note/${note.id}`)} />
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
