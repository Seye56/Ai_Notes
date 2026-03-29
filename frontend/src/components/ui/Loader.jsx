const Loader = ({ label = 'Loading...' }) => {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span
        className="inline-flex h-5 w-5 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border-soft)', borderTopColor: 'var(--accent)' }}
      />
      <span>{label}</span>
    </div>
  )
}

export default Loader
