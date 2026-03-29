const Modal = ({ open, title, children, onClose }) => {
  if (!open) {
    return null
  }

  return (
    <div className="overlay-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="panel w-full max-w-xl rounded-[28px] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-main">{title}</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-main">
            x
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

export default Modal
