const variantMap = {
  primary:
    'text-white shadow-lg hover:brightness-105',
  secondary:
    'border text-[var(--text-soft)] hover:bg-[var(--accent-soft)]',
  ghost:
    'text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]',
  danger:
    'text-white shadow-lg hover:brightness-105',
}

const styleMap = {
  primary: {
    background: 'linear-gradient(135deg, var(--accent) 0%, #ec4899 100%)',
    borderColor: 'transparent',
  },
  secondary: {
    background: 'var(--surface)',
    borderColor: 'var(--border-soft)',
  },
  ghost: {
    background: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    background: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
    borderColor: 'transparent',
  },
}

const Button = ({
  children,
  className = '',
  variant = 'primary',
  disabled = false,
  style,
  ...props
}) => {
  return (
    <button
      disabled={disabled}
      style={{ ...(styleMap[variant] ?? styleMap.primary), ...style }}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantMap[variant] ?? variantMap.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
