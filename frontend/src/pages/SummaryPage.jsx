import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FolderOpen, MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import Modal from '../components/ui/Modal'
import { useNoteStore } from '../store/noteStore'
import { useStudyStore } from '../store/studyStore'
import { useUserStore } from '../store/userStore'

const SummaryPage = () => {
  const navigate = useNavigate()
  const { profile } = useUserStore()
  const { notes, folders, loading: notesLoading, fetchNotes, hydrateFolders } = useNoteStore()
  const {
    summaries,
    summaryFolders,
    loading,
    hydrateSummaries,
    hydrateSummaryFolders,
    summarizeAndStore,
    createSummaryFolder,
    moveSummariesToFolder,
    deleteSummaryFolder,
  } = useStudyStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [pickerFolderId, setPickerFolderId] = useState(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedSummaries, setSelectedSummaries] = useState([])
  const [folderName, setFolderName] = useState('')

  useEffect(() => {
    fetchNotes().catch((error) => toast.error(error.message))
  }, [fetchNotes])

  useEffect(() => {
    if (profile?.id) {
      hydrateFolders(profile.id)
      hydrateSummaries(profile.id)
      hydrateSummaryFolders(profile.id)
    }
  }, [hydrateFolders, hydrateSummaries, hydrateSummaryFolders, profile?.id])

  const folderNameByNoteId = useMemo(() => {
    const map = new Map()
    folders.forEach((folder) => {
      folder.noteIds.forEach((noteId) => {
        map.set(noteId, folder.name)
      })
    })
    return map
  }, [folders])

  const summarizedNoteIds = new Set(summaries.map((summary) => summary.note_id))
  const folderNameBySummaryId = useMemo(() => {
    const map = new Map()
    summaryFolders.forEach((folder) => {
      folder.itemIds.forEach((summaryId) => {
        map.set(summaryId, folder.name)
      })
    })
    return map
  }, [summaryFolders])

  const pickerNotes = useMemo(() => {
    if (pickerFolderId === 'my-notes') {
      return notes.filter((note) => !folders.some((folder) => folder.noteIds.includes(note.id)))
    }

    if (pickerFolderId) {
      const folder = folders.find((item) => item.id === pickerFolderId)
      return notes.filter((note) => folder?.noteIds.includes(note.id))
    }

    return notes
  }, [folders, notes, pickerFolderId])

  const summariesInSelectedFolder = useMemo(() => {
    if (selectedFolderId) {
      const folder = summaryFolders.find((item) => item.id === selectedFolderId)
      return summaries.filter((summary) => folder?.itemIds.includes(summary.id))
    }

    return summaries.filter((summary) => !summaryFolders.some((folder) => folder.itemIds.includes(summary.id)))
  }, [selectedFolderId, summaries, summaryFolders])

  const handleSummarizeNote = async (note) => {
    try {
      const entry = await summarizeAndStore({
        userId: profile?.id,
        note,
        folderName: folderNameByNoteId.get(note.id) ?? null,
      })
      setCreateOpen(false)
      toast.success(`${note.title} summarized.`)
      navigate(`/summary/${entry.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleSelection = (summaryId) => {
    setSelectedSummaries((current) =>
      current.includes(summaryId) ? current.filter((id) => id !== summaryId) : [...current, summaryId]
    )
  }

  const handleOpenSelectionMode = () => {
    setActionsOpen(false)
    setSelectionMode(true)
  }

  const handleOpenFolders = () => {
    setActionsOpen(false)
    setFoldersOpen(true)
  }

  const handleExitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedSummaries([])
  }

  const handleCreateFolder = () => {
    try {
      const folder = createSummaryFolder(profile?.id, folderName)
      setFolderName('')
      toast.success(`${folder.name} created.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleMoveSelectedToFolder = (folderId) => {
    try {
      moveSummariesToFolder(profile?.id, selectedSummaries, folderId)
      toast.success(folderId ? 'Summaries moved to folder.' : 'Summaries moved back to Summary.')
      handleExitSelectionMode()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteFolder = (folder) => {
    const moveToSummary = window.confirm(
      `Delete "${folder.name}"?\n\nPress OK to move its summaries back to Summary.\nPress Cancel if you want to choose the delete-everything option next.`
    )

    if (moveToSummary) {
      try {
        deleteSummaryFolder(profile?.id, folder.id, 'move')
        if (selectedFolderId === folder.id) {
          setSelectedFolderId(null)
        }
        toast.success('Folder deleted. Summaries moved back to Summary.')
      } catch (error) {
        toast.error(error.message)
      }
      return
    }

    const deleteEverything = window.confirm(
      `Delete "${folder.name}" and every summary inside it? This cannot be undone.`
    )

    if (!deleteEverything) {
      return
    }

    try {
      deleteSummaryFolder(profile?.id, folder.id, 'delete')
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null)
      }
      toast.success('Folder and its summaries deleted.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">Summary</h1>
          <p className="text-sm text-muted">
            {selectedFolderId
              ? `Viewing ${summaryFolders.find((folder) => folder.id === selectedFolderId)?.name}. Move summaries in and out whenever you need.`
              : 'Keep your summarized notes in one calm workspace so they are always easy to revisit.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <>
              <div className="glass-chip rounded-full px-4 py-2 text-sm font-medium text-main">
                {selectedSummaries.length} selected
              </div>
              {summaryFolders.length ? (
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
                  <option value="" disabled>Move to folder</option>
                  {summaryFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button variant="secondary" onClick={() => handleMoveSelectedToFolder(null)} disabled={!selectedSummaries.length}>
                Move to Summary
              </Button>
              <Button variant="secondary" onClick={handleExitSelectionMode}>
                <X size={16} />
                Done
              </Button>
            </>
          ) : (
            <>
              <Button className="h-12 w-12 rounded-full px-0" onClick={() => setCreateOpen(true)} aria-label="Summarize a note">
                <Plus size={20} />
              </Button>
              <div className="relative">
                <Button
                  variant="secondary"
                  className="h-12 w-12 rounded-full px-0"
                  onClick={() => setActionsOpen((open) => !open)}
                  aria-label="Summary actions"
                >
                  <MoreHorizontal size={18} />
                </Button>
                {actionsOpen ? (
                  <div className="panel absolute right-0 top-14 z-20 flex min-w-[13rem] flex-col rounded-2xl p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false)
                        setSelectedFolderId(null)
                      }}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Show all summaries
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenSelectionMode}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Select summaries
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenFolders}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                    >
                      Folders
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
          Summary
        </button>
        {summaryFolders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => setSelectedFolderId(folder.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
          >
            {folder.name} ({folder.itemIds.length})
          </button>
        ))}
      </div>

      {notesLoading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading notes..." />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summariesInSelectedFolder.length ? (
              summariesInSelectedFolder.map((summary) => (
                <button
                  key={summary.id}
                  type="button"
                  onClick={() => selectionMode ? toggleSelection(summary.id) : navigate(`/summary/${summary.id}`)}
                  className="panel w-full text-left rounded-[28px] p-5 transition hover:-translate-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-main">{summary.note_title}</p>
                      <p className="mt-1 text-sm text-muted">
                        Summarized from {folderNameBySummaryId.get(summary.id) || summary.folder_name || 'Summary'}
                      </p>
                    </div>
                    <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                      {new Date(summary.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {selectionMode && selectedSummaries.includes(summary.id) ? (
                    <div className="mt-4 inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      Selected
                    </div>
                  ) : null}
                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-soft whitespace-pre-wrap">
                    {summary.summary_text}
                  </p>
                </button>
              ))
            ) : (
              <div className="panel rounded-[28px] p-6 text-sm text-muted">
                No summaries yet. Use the plus button to pick a note and summarize it here.
              </div>
            )}
          </section>
        </div>
      )}

      <Modal open={createOpen} title="Summarize a note" onClose={() => setCreateOpen(false)}>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPickerFolderId(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${pickerFolderId === null ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              All notes
            </button>
            <button
              type="button"
              onClick={() => setPickerFolderId('my-notes')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${pickerFolderId === 'my-notes' ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              My Notes
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setPickerFolderId(folder.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${pickerFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
              >
                {folder.name}
              </button>
            ))}
          </div>

          <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
            {pickerNotes.map((note) => (
                <div key={note.id} className="panel-soft rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-main">{note.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {folderNameByNoteId.get(note.id) || 'My Notes'}
                        {summarizedNoteIds.has(note.id) ? ' • Already summarized' : ''}
                      </p>
                    </div>
                    <Button onClick={() => handleSummarizeNote(note)} disabled={loading}>
                      {summarizedNoteIds.has(note.id) ? 'Refresh summary' : 'Summarize'}
                    </Button>
                  </div>
                </div>
              ))}
            {!pickerNotes.length ? (
              <div className="panel-soft rounded-2xl p-4 text-sm text-muted">
                No notes found in this section yet.
              </div>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal open={foldersOpen} title="Summary folders" onClose={() => setFoldersOpen(false)}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Create a summary folder"
              className="input-field flex-1"
            />
            <Button onClick={handleCreateFolder}>
              <FolderOpen size={16} />
              Create
            </Button>
          </div>

          <div className="space-y-3">
            {summaryFolders.length ? (
              summaryFolders.map((folder) => (
                <div key={folder.id} className="panel-soft flex items-center justify-between rounded-2xl p-4">
                  <div>
                    <p className="font-semibold text-main">{folder.name}</p>
                    <p className="text-sm text-muted">{folder.itemIds.length} summaries</p>
                  </div>
                  <Button variant="danger" onClick={() => handleDeleteFolder(folder)}>
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </div>
              ))
            ) : (
              <div className="panel-soft rounded-2xl p-4 text-sm text-muted">
                No summary folders yet.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SummaryPage
