import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CalendarDays, Flame, Plus, Sparkles } from 'lucide-react'
import CreateNoteModal from '../components/notes/CreateNoteModal'
import NoteList from '../components/notes/NoteList'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import { useNoteStore } from '../store/noteStore'
import { useUserStore } from '../store/userStore'

const inspirationQuotes = [
  {
    quote: 'It always seems impossible until it is done.',
    author: 'Nelson Mandela',
  },
  {
    quote: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    quote: 'The secret of getting ahead is getting started.',
    author: 'Mark Twain',
  },
  {
    quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Will Durant',
  },
]

const formatLoginDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

const Dashboard = () => {
  const navigate = useNavigate()
  const { notes, loading, saving, fetchNotes, createNote } = useNoteStore()
  const { habitStats, profile } = useUserStore()
  const [createOpen, setCreateOpen] = useState(false)

  const quoteIndex = Math.abs((habitStats.streak || 0) + (habitStats.totalLogins || 0)) % inspirationQuotes.length
  const inspirationQuote = inspirationQuotes[quoteIndex]
  const recentLogins = habitStats.recentDates.slice(0, 5)

  useEffect(() => {
    fetchNotes().catch(() => {})
  }, [fetchNotes])

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

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.6fr,0.9fr]">
        <div className="panel-accent rounded-[32px] p-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent)]">Workspace overview</p>
          <h1 className="mt-4 text-3xl font-bold text-main">Build notes once, then translate, summarize, quiz, speak, and collaborate from the same source.</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setCreateOpen(true)}>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Habit tracker</p>
              <h2 className="mt-2 text-xl font-bold text-main">
                {profile?.full_name ? `${profile.full_name.split(' ')[0]}'s momentum` : 'Your momentum'}
              </h2>
            </div>
            <div className="glass-chip rounded-full px-3 py-2 text-xs font-semibold text-[var(--accent-strong)]">
              {habitStats.streak} day streak
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="glass-chip rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <CalendarDays size={16} />
                Logins
              </div>
              <p className="mt-3 text-3xl font-bold text-main">{habitStats.totalLogins}</p>
              <p className="text-sm text-muted">Times you have shown up</p>
            </div>

            <div className="glass-chip rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                <Flame size={16} />
                Streak
              </div>
              <p className="mt-3 text-3xl font-bold text-main">{habitStats.streak}</p>
              <p className="text-sm text-muted">Consecutive active days</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)]/70 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Recent login days</p>
            {recentLogins.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recentLogins.map((date) => (
                  <span key={date} className="glass-chip rounded-full px-3 py-2 text-sm text-main">
                    {formatLoginDate(date)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Your login rhythm will start showing up here after your next sign-in.</p>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--accent-soft)]/80 p-4 text-sm text-soft">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">Inspiration</p>
            <p className="mt-2 text-base font-medium leading-7 text-main">“{inspirationQuote.quote}”</p>
            <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">{inspirationQuote.author}</p>
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
            onCreate={() => setCreateOpen(true)}
            onSelect={(note) => navigate(`/note/${note.id}`)}
          />
        )}
      </section>

      <CreateNoteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateNote}
        busy={saving}
      />
    </div>
  )
}

export default Dashboard
