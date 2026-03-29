import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FolderOpen, MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import CreateNoteModal from '../components/notes/CreateNoteModal'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import NoteImport from '../components/notes/NoteImport'
import NoteList from '../components/notes/NoteList'
import { useNoteStore } from '../store/noteStore'
import { useUserStore } from '../store/userStore'
import { createTranslator } from '../utils/appText'

const NotesPage = () => {
  const navigate = useNavigate()
  const { profile } = useUserStore()
  const t = createTranslator(profile?.preferred_language)
  const {
    notes,
    folders,
    loading,
    saving,
    fetchNotes,
    importNote,
    createNote,
    deleteNote,
    hydrateFolders,
    createFolder,
    moveNotesToFolder,
    deleteFolder,
  } = useNoteStore()
  const [importOpen, setImportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [importTitle, setImportTitle] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [file, setFile] = useState(null)
  const [folderName, setFolderName] = useState('')
  const [actionsOpen, setActionsOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState([])
  const [selectedFolderId, setSelectedFolderId] = useState(null)

  useEffect(() => {
    fetchNotes().catch(() => {})
  }, [fetchNotes])

  useEffect(() => {
    if (profile?.id) {
      hydrateFolders(profile.id)
    }
  }, [hydrateFolders, profile?.id])

  const handleCreateNote = async (title) => {
    try {
      const note = await createNote({
        title,
        content: '',
        source_language: profile?.preferred_language || 'en',
      })
      setCreateOpen(false)
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

  const handleOpenFolders = () => {
    setActionsOpen(false)
    setFoldersOpen(true)
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

  const handleCreateFolder = () => {
    try {
      const folder = createFolder(profile?.id, folderName)
      setFolderName('')
      toast.success(`${folder.name} created.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleMoveSelectedToFolder = (folderId) => {
    try {
      moveNotesToFolder(profile?.id, selectedNotes, folderId)
      toast.success(folderId ? 'Notes moved to folder.' : 'Notes moved back to notes.')
      handleExitSelectionMode()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteFolder = async (folder) => {
    const moveToNotes = window.confirm(
      `Delete "${folder.name}"?\n\nPress OK to move its notes back to My Notes.\nPress Cancel if you want to choose the delete-everything option next.`
    )

    if (moveToNotes) {
      try {
        await deleteFolder(profile?.id, folder.id, 'move')
        if (selectedFolderId === folder.id) {
          setSelectedFolderId(null)
        }
        toast.success(`Folder deleted. Notes moved back to My Notes.`)
      } catch (error) {
        toast.error(error.message)
      }
      return
    }

    const deleteEverything = window.confirm(
      `Delete "${folder.name}" and every note inside it? This cannot be undone.`
    )

    if (!deleteEverything) {
      return
    }

    try {
      await deleteFolder(profile?.id, folder.id, 'delete')
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null)
      }
      toast.success(`Folder and its notes deleted.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const notesInSelectedFolder = selectedFolderId
    ? notes.filter((note) => folders.find((folder) => folder.id === selectedFolderId)?.noteIds.includes(note.id))
    : notes.filter((note) => !folders.some((folder) => folder.noteIds.includes(note.id)))

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">{t('my_notes')}</h1>
          <p className="text-sm text-muted">
            {selectedFolder
              ? `Viewing ${selectedFolder.name}. Move notes in and out whenever you need.`
              : t('manage_notes_copy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <>
              <div className="glass-chip rounded-full px-4 py-2 text-sm font-medium text-main">
                {selectedNotes.length} selected
              </div>
              {folders.length ? (
                <select
                  className="select-field w-auto min-w-[12rem]"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) {
                      handleMoveSelectedToFolder(event.target.value)
                      event.target.value = ''
                    }
                  }}
                >
                  <option value="" disabled>{t('move_to_folder')}</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button variant="secondary" onClick={() => handleMoveSelectedToFolder(null)} disabled={!selectedNotes.length}>
                {t('move_to_notes')}
              </Button>
              <Button variant="danger" onClick={handleDeleteSelected} disabled={!selectedNotes.length || saving}>
                <Trash2 size={16} />
                {t('delete_selected')}
              </Button>
              <Button variant="secondary" onClick={handleExitSelectionMode}>
                <X size={16} />
                {t('done')}
              </Button>
            </>
          ) : (
            <>
              <Button
                className="h-12 w-12 rounded-full px-0"
                onClick={() => setCreateOpen(true)}
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
                      {t('import_note')}
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenSelectionMode}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      {t('select_notes')}
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenFolders}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      {t('folders')}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelectedFolderId(null)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === null ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
        >
          {t('my_notes')}
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => setSelectedFolderId(folder.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
          >
            {folder.name} ({folder.noteIds.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading notes..." />
        </div>
      ) : (
        <NoteList
          notes={notesInSelectedFolder}
          onCreate={() => setCreateOpen(true)}
          selectable={selectionMode}
          selectedIds={selectedNotes}
          onToggleSelect={toggleSelection}
          onSelect={(note) => navigate(`/note/${note.id}`)}
        />
      )}

      <Modal open={importOpen} title={t('import_note')} onClose={() => setImportOpen(false)}>
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

      <CreateNoteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateNote}
        busy={saving}
      />

      <Modal open={foldersOpen} title={t('folder_manage')} onClose={() => setFoldersOpen(false)}>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input-field"
              placeholder={t('new_folder_name')}
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
            />
            <Button onClick={handleCreateFolder}>
              <FolderOpen size={16} />
              {t('create_folder')}
            </Button>
          </div>

          <div className="space-y-3">
            {folders.length ? (
              folders.map((folder) => (
                <div key={folder.id} className="panel-soft rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-main">{folder.name}</p>
                      <p className="text-sm text-muted">{folder.noteIds.length} note{folder.noteIds.length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedFolderId(folder.id)
                          setFoldersOpen(false)
                        }}
                      >
                        {t('open')}
                      </Button>
                      {selectionMode && selectedNotes.length ? (
                        <Button variant="ghost" onClick={() => handleMoveSelectedToFolder(folder.id)}>
                          {t('move_selected_here')}
                        </Button>
                      ) : null}
                      <Button variant="danger" onClick={() => handleDeleteFolder(folder)}>
                        {t('delete_folder')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="panel-soft rounded-2xl p-4 text-sm text-muted">
                {t('no_folders_yet')}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default NotesPage
