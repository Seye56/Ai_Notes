import { MoreHorizontal } from 'lucide-react'

const colorMap = {
  blue: '#93C5FD',
  pink: '#FBCFE8',
  yellow: '#FDE047',
  mint: '#CCF5D2',
  purple: '#DDD6FE',
}

const NoteCard = ({ title, excerpt, date, color = 'blue', onClick }) => {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-4 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col gap-2"
      style={{ backgroundColor: colorMap[color] ?? colorMap.blue }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {date ?? 'No date'}
        </span>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-gray-700 transition"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h3 className="font-bold text-gray-800 text-base">{title}</h3>

      {excerpt && (
        <p className="text-sm text-gray-600 line-clamp-3">{excerpt}</p>
      )}
    </div>
  )
}

export default NoteCard
