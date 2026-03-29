const NoteEditor = ({ note, onChange, readOnly = false }) => {
  return (
    <div className="panel rounded-[28px] p-6 space-y-5">
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
