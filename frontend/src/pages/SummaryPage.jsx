import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { MoreHorizontal, Plus } from 'lucide-react'
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
  const { summaries, loading, hydrateSummaries, summarizeAndStore } = useStudyStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [activeSummaryId, setActiveSummaryId] = useState(null)

  useEffect(() => {
    fetchNotes().catch((error) => toast.error(error.message))
  }, [fetchNotes])

  useEffect(() => {
    if (profile?.id) {
      hydrateFolders(profile.id)
      const loaded = hydrateSummaries(profile.id)
      if (loaded[0]?.id) {
        setActiveSummaryId(loaded[0].id)
      }
    }
  }, [hydrateFolders, hydrateSummaries, profile?.id])

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

  const pickerNotes = useMemo(() => {
    if (selectedFolderId === 'my-notes') {
      return notes.filter((note) => !folders.some((folder) => folder.noteIds.includes(note.id)))
    }

    if (selectedFolderId) {
      const folder = folders.find((item) => item.id === selectedFolderId)
      return notes.filter((note) => folder?.noteIds.includes(note.id))
    }

    return notes
  }, [folders, notes, selectedFolderId])

  const activeSummary = summaries.find((summary) => summary.id === activeSummaryId) ?? summaries[0] ?? null

  const handleSummarizeNote = async (note) => {
    try {
      const entry = await summarizeAndStore({
        userId: profile?.id,
        note,
        folderName: folderNameByNoteId.get(note.id) ?? null,
      })
      setActiveSummaryId(entry.id)
      setCreateOpen(false)
      toast.success(`${note.title} summarized.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-main">Summary</h1>
          <p className="text-sm text-muted">Keep your summarized notes in one calm workspace so they are always easy to revisit.</p>
        </div>
        <div className="flex items-center gap-3">
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
                    setActiveSummaryId(null)
                  }}
                  className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                >
                  Show all summaries
                </button>
                {activeSummary ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false)
                      navigate(`/note/${activeSummary.note_id}`)
                    }}
                    className="rounded-xl px-3 py-2 text-left text-sm font-medium text-main transition hover:bg-[var(--accent-soft)]"
                  >
                    Open source note
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {notesLoading ? (
        <div className="panel rounded-[28px] p-6">
          <Loader label="Loading notes..." />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-4">
            {summaries.length ? (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <button
                    key={summary.id}
                    type="button"
                    onClick={() => setActiveSummaryId(summary.id)}
                    className={`panel w-full text-left rounded-[28px] p-5 transition hover:-translate-y-1 ${activeSummary?.id === summary.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
                  >
                    <p className="text-lg font-bold text-main">{summary.note_title}</p>
                    <p className="mt-1 text-sm text-muted">
                      Summarized from {summary.folder_name || 'My Notes'}
                    </p>
                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-soft whitespace-pre-wrap">
                      {summary.summary_text}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="panel rounded-[28px] p-6 text-sm text-muted">
                No summaries yet. Use the plus button to pick a note and summarize it here.
              </div>
            )}
          </section>

          <section className="panel rounded-[32px] p-6">
            {activeSummary ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-main">{activeSummary.note_title}</h2>
                    <p className="mt-1 text-sm text-muted">Summarized from {activeSummary.folder_name || 'My Notes'}</p>
                  </div>
                  <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
                    {new Date(activeSummary.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="panel-soft mt-6 rounded-[28px] p-5 text-sm leading-8 text-soft whitespace-pre-wrap">
                  {activeSummary.summary_text}
                </div>
              </>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-muted">
                Pick or create a summary to see the full summarized note here.
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
              onClick={() => setSelectedFolderId(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === null ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              All notes
            </button>
            <button
              type="button"
              onClick={() => setSelectedFolderId('my-notes')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === 'my-notes' ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
            >
              My Notes
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedFolderId === folder.id ? 'bg-[var(--accent)] text-white' : 'glass-chip'}`}
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
    </div>
  )
}

export default SummaryPage
