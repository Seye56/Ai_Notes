import { Check, MoreHorizontal } from 'lucide-react'

const colorMap = {
  blue: 'linear-gradient(135deg, rgba(125, 211, 252, 0.46), rgba(191, 219, 254, 0.28))',
  pink: 'linear-gradient(135deg, rgba(249, 168, 212, 0.42), rgba(251, 207, 232, 0.24))',
  yellow: 'linear-gradient(135deg, rgba(253, 224, 71, 0.42), rgba(254, 240, 138, 0.28))',
  mint: 'linear-gradient(135deg, rgba(134, 239, 172, 0.42), rgba(209, 250, 229, 0.22))',
  purple: 'linear-gradient(135deg, rgba(196, 181, 253, 0.44), rgba(221, 214, 254, 0.26))',
}

const NoteCard = ({
  title,
  excerpt,
  date,
  color = 'blue',
  onClick,
  selectable = false,
  selected = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 cursor-pointer border transition-all duration-200 flex flex-col gap-2 hover:-translate-y-1 ${selected ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent' : ''}`}
      style={{
        background: colorMap[color] ?? colorMap.blue,
        borderColor: selected ? 'var(--accent)' : 'var(--border-soft)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">
          {date ?? 'No date'}
        </span>
        {selectable ? (
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-transparent'}`}
            style={{ borderColor: selected ? 'var(--accent)' : 'var(--border-soft)' }}
          >
            <Check size={14} />
          </div>
        ) : (
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-muted hover:text-main transition"
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>

      <h3 className="font-bold text-main text-base">{title}</h3>

      {excerpt && (
        <p className="text-sm text-soft line-clamp-3">{excerpt}</p>
      )}
    </div>
  )
}

export default NoteCard
