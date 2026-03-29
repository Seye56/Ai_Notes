import { useUserStore } from '../../store/userStore'
import { createTranslator } from '../../utils/appText'

const Loader = ({ label }) => {
  const { profile } = useUserStore()
  const t = createTranslator(profile?.preferred_language)
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span
        className="inline-flex h-5 w-5 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border-soft)', borderTopColor: 'var(--accent)' }}
      />
      <span>{label ?? t('loading')}</span>
    </div>
  )
}

export default Loader
