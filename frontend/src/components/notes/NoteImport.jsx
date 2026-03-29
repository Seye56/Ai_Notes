import { acceptedImportTypes, getFileDisplayName } from '../../utils/fileParser'
import Button from '../ui/Button'

const NoteImport = ({
  importTitle,
  pastedText,
  sourceLanguage,
  file,
  onTitleChange,
  onTextChange,
  onLanguageChange,
  onFileChange,
  onSubmit,
  busy = false,
}) => {
  return (
    <div className="panel rounded-[28px] border-dashed p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-main">Import note</h3>
        <p className="text-sm text-muted">Paste text or upload a `.txt`, `.pdf`, or `.docx` file.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr,160px]">
        <input
          type="text"
          value={importTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Optional title"
          className="input-field"
        />
        <input
          type="text"
          value={sourceLanguage}
          onChange={(event) => onLanguageChange(event.target.value)}
          placeholder="en"
          className="input-field"
        />
      </div>

      <textarea
        value={pastedText}
        onChange={(event) => onTextChange(event.target.value)}
        className="textarea-field min-h-[180px] w-full rounded-[24px]"
        placeholder="Paste typed notes here..."
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="panel-soft rounded-2xl px-4 py-3 text-sm cursor-pointer">
          <input
            type="file"
            accept={acceptedImportTypes}
            className="hidden"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          {getFileDisplayName(file)}
        </label>
        <Button onClick={onSubmit} disabled={busy}>
          {busy ? 'Importing...' : 'Import into notes'}
        </Button>
      </div>
    </div>
  )
}

export default NoteImport
