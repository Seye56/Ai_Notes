import NoteCard from './NoteCard'

const NoteList = ({ notes, onSelect }) => {
  if (!notes.length) {
    return (
      <div className="panel rounded-[28px] p-6 text-sm text-muted">
        No notes yet. Create one or import a document to get started.
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
          onClick={() => onSelect(note)}
        />
      ))}
    </div>
  )
}

export default NoteList
