import { useUserStore } from '../../store/userStore'
import { createTranslator } from '../../utils/appText'

const NoteEditor = ({ note, onChange, readOnly = false }) => {
  const { profile } = useUserStore()
  const t = createTranslator(profile?.preferred_language)
  return (
    <div className="panel rounded-[28px] p-6 space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-soft">{t('content')}</span>
        <textarea
          value={note.content}
          disabled={readOnly}
          onChange={(event) => onChange('content', event.target.value)}
          className="textarea-field min-h-[360px] w-full rounded-[24px]"
          placeholder={t('write_your_study_notes_here')}
        />
      </label>
    </div>
  )
}

export default NoteEditor
