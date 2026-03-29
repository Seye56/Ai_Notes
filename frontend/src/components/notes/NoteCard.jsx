import { MoreHorizontal } from 'lucide-react'

const colorMap = {
  blue: 'linear-gradient(135deg, rgba(96, 165, 250, 0.22), rgba(191, 219, 254, 0.14))',
  pink: 'linear-gradient(135deg, rgba(244, 114, 182, 0.18), rgba(251, 207, 232, 0.12))',
  yellow: 'linear-gradient(135deg, rgba(250, 204, 21, 0.18), rgba(254, 240, 138, 0.12))',
  mint: 'linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(209, 250, 229, 0.1))',
  purple: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(221, 214, 254, 0.12))',
}

const NoteCard = ({ title, excerpt, date, color = 'blue', onClick }) => {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-4 cursor-pointer border transition-all duration-200 flex flex-col gap-2 hover:-translate-y-1"
      style={{
        background: colorMap[color] ?? colorMap.blue,
        borderColor: 'var(--border-soft)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wide">
          {date ?? 'No date'}
        </span>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-muted hover:text-main transition"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h3 className="font-bold text-main text-base">{title}</h3>

      {excerpt && (
        <p className="text-sm text-soft line-clamp-3">{excerpt}</p>
      )}
    </div>
  )
}

export default NoteCard
