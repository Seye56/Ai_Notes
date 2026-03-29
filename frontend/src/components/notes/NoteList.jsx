import { FileText, Plus } from 'lucide-react'
import NoteCard from './NoteCard'

const CreateNoteCard = ({ onCreate }) => (
  <button
    type="button"
    onClick={onCreate}
    className="panel group relative flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
  >
    <div className="relative flex h-24 w-20 items-center justify-center rounded-[1.7rem] border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] transition group-hover:border-[var(--accent)]">
      <div className="absolute right-3 top-3 h-4 w-4 rotate-45 rounded-sm border border-[var(--border-strong)] bg-[var(--surface)]" />
      <FileText size={28} className="text-[var(--accent-strong)]" />
      <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent-strong)] shadow-lg">
        <Plus size={18} />
      </div>
    </div>
    <p className="mt-6 text-base font-semibold text-main">Create a new note</p>
    <p className="mt-2 max-w-[14rem] text-sm text-muted">Start a fresh idea right here. Your next note always stays within reach.</p>
  </button>
)

const NoteList = ({ notes, onSelect, onCreate, selectable = false, selectedIds = [], onToggleSelect }) => {
  if (!notes.length) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CreateNoteCard onCreate={onCreate} />
        <div className="panel rounded-[28px] p-6 text-sm text-muted">
          No notes yet. Create one or import a document to get started.
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((note, index) => (
        <NoteCard
          key={note.id}
          title={note.title}
          excerpt={note.content}
          date={new Date(note.updated_at ?? note.created_at).toLocaleDateString()}
          color={['purple', 'blue', 'pink', 'yellow', 'mint'][index % 5]}
          selectable={selectable}
          selected={selectedIds.includes(note.id)}
          onClick={() => (selectable ? onToggleSelect(note.id) : onSelect(note))}
        />
      ))}
      <CreateNoteCard onCreate={onCreate} />
    </div>
  )
}

export default NoteList
