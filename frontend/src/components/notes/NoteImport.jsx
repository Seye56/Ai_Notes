import { acceptedImportTypes, getFileDisplayName } from '../../utils/fileParser'
import { languageOptions } from '../../utils/languageMap'
import Button from '../ui/Button'
import { useUserStore } from '../../store/userStore'
import { createTranslator } from '../../utils/appText'

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
  const { profile } = useUserStore()
  const t = createTranslator(profile?.preferred_language)
  return (
    <div className="panel rounded-[28px] border-dashed p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-main">{t('import_note')}</h3>
        <p className="text-sm text-muted">{t('import_note_copy')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr,160px]">
        <input
          type="text"
          value={importTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t('optional_title')}
          className="input-field"
        />
        <select
          value={sourceLanguage}
          onChange={(event) => onLanguageChange(event.target.value)}
          className="select-field"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={pastedText}
        onChange={(event) => onTextChange(event.target.value)}
        className="textarea-field min-h-[180px] w-full rounded-[24px]"
        placeholder={t('paste_typed_notes_here')}
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
          {busy ? t('importing') : t('import_into_notes')}
        </Button>
      </div>
    </div>
  )
}

export default NoteImport
