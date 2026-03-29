const NoteEditor = ({ note, onChange, readOnly = false }) => {
  return (
    <div className="panel rounded-[28px] p-6 space-y-5">
      <div className="grid gap-4 md:grid-cols-[1.5fr,180px]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-soft">Title</span>
          <input
            type="text"
            value={note.title}
            disabled={readOnly}
            onChange={(event) => onChange('title', event.target.value)}
            className="input-field"
            placeholder="Name your note"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-soft">Language</span>
          <input
            type="text"
            value={note.source_language}
            disabled={readOnly}
            onChange={(event) => onChange('source_language', event.target.value)}
            className="input-field"
            placeholder="en"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-soft">Content</span>
        <textarea
          value={note.content}
          disabled={readOnly}
          onChange={(event) => onChange('content', event.target.value)}
          className="textarea-field min-h-[360px] w-full rounded-[24px]"
          placeholder="Write your study notes here..."
        />
      </label>
    </div>
  )
}

export default NoteEditor
