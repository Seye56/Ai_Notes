import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Sparkles, Volume2 } from 'lucide-react'
import NoteList from '../components/notes/NoteList'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import { useNoteStore } from '../store/noteStore'

const Dashboard = () => {
  const navigate = useNavigate()
  const { notes, loading, fetchNotes, createNote } = useNoteStore()

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

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.6fr,0.9fr]">
        <div className="panel-accent rounded-[32px] p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Workspace overview</p>
          <h1 className="mt-4 text-3xl font-bold text-main">Build notes once, then translate, summarize, quiz, speak, and collaborate from the same source.</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleCreateNote}>
              <Plus size={16} />
              New note
            </Button>
            <Button variant="secondary" onClick={() => navigate('/groups')}>
              <Sparkles size={16} />
              Open group room
            </Button>
          </div>
        </div>

        <div className="panel rounded-[32px] p-6">
          <p className="text-sm text-muted">Quick stats</p>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-3xl font-bold text-main">{notes.length}</p>
              <p className="text-sm text-muted">Notes in your workspace</p>
            </div>
            <div className="glass-chip rounded-2xl p-4">
              <div className="flex items-center gap-2 text-[var(--accent-strong)] font-semibold">
                <Volume2 size={16} />
                Speech enabled
              </div>
              <p className="mt-2 text-sm text-soft">Generate quiz, note, and summary audio directly from the backend.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Recent notes</h2>
            <p className="text-sm text-muted">Open a note to edit, study, or share it.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/notes')}>View all</Button>
        </div>

        {loading ? (
          <div className="panel rounded-[28px] p-6">
            <Loader label="Loading notes..." />
          </div>
        ) : (
          <NoteList
            notes={notes.slice(0, 6)}
            onSelect={(note) => navigate(`/note/${note.id}`)}
          />
        )}
      </section>
    </div>
  )
}

export default Dashboard
