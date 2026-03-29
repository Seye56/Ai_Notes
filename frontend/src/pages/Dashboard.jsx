import { useNavigate } from 'react-router-dom'
import NoteCard from '../components/notes/NoteCard'
import { Plus } from 'lucide-react'

const mockNotes = [
  { id: 1, title: 'Mid Test Exam', excerpt: 'Key concepts from chapter 4 and 5 covering thermodynamics and motion.', date: 'Today', color: 'yellow' },
  { id: 2, title: 'Class Notes', excerpt: 'Lecture recap on neural networks, backpropagation, and gradient descent.', date: 'Today', color: 'blue' },
  { id: 3, title: "Jonas's Notes", excerpt: 'Study group summary from last Thursday including practice problems.', date: 'Yesterday', color: 'pink' },
  { id: 4, title: 'Book List', excerpt: 'Reading list for the semester with summaries and key takeaways.', date: 'This Week', color: 'mint' },
]

const Dashboard = () => {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">

      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-100 via-pink-50 to-yellow-50 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Welcome back 👋
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            Ready to study smarter across languages?
          </p>
          <button
            onClick={() => navigate('/note/new')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>

        <div className="w-36 h-36 bg-white rounded-2xl shadow-inner flex items-center justify-center text-6xl">
          📚
        </div>
      </section>

      {/* Notes Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">My Notes</h2>
          <div className="flex gap-3 text-sm text-gray-400">
            <button className="hover:text-purple-600 transition font-medium">Today</button>
            <button className="hover:text-purple-600 transition font-medium">This Week</button>
            <button className="hover:text-purple-600 transition font-medium">This Month</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockNotes.map((note) => (
            <NoteCard
              key={note.id}
              title={note.title}
              excerpt={note.excerpt}
              date={note.date}
              color={note.color}
              onClick={() => navigate(`/note/${note.id}`)}
            />
          ))}
        </div>
      </section>

    </div>
  )
}

export default Dashboard

