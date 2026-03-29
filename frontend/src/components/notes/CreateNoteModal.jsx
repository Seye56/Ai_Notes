import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { useUserStore } from '../../store/userStore'
import { createTranslator } from '../../utils/appText'

const CreateNoteModal = ({ open, onClose, onSubmit, busy = false }) => {
  const { profile } = useUserStore()
  const t = createTranslator(profile?.preferred_language)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) {
      setTitle('')
    }
  }, [open])

  const handleSubmit = async () => {
    await onSubmit(title.trim() || t('untitled_note'))
  }

  return (
    <Modal open={open} title={t('create_a_note')} onClose={onClose}>
      <div className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-soft">{t('note_name')}</span>
          <input
            className="input-field"
            placeholder={t('name_your_note')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleSubmit().catch(() => {})
              }
            }}
          />
        </label>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? t('creating') : t('create_note')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateNoteModal
