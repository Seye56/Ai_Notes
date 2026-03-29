import { useEffect, useState } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

const CreateNoteModal = ({ open, onClose, onSubmit, busy = false }) => {
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) {
      setTitle('')
    }
  }, [open])

  const handleSubmit = async () => {
    await onSubmit(title.trim() || 'Untitled Note')
  }

  return (
    <Modal open={open} title="Create a note" onClose={onClose}>
      <div className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-soft">Note name</span>
          <input
            className="input-field"
            placeholder="Name your note"
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? 'Creating...' : 'Create note'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateNoteModal
