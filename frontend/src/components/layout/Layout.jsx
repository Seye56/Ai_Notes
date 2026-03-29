import { Link, Outlet, useLocation } from 'react-router-dom'
import { FileText, Home, BookOpen, Settings, Brain } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/notes', label: 'My Notes', icon: FileText },
  { to: '/study', label: 'Study Mode', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const Layout = () => {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#f6f7fb] flex">

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-white shadow-md flex flex-col py-6 px-4 z-20">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-800">AI Notes</span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition
                  ${isActive
                    ? 'bg-purple-100 text-purple-700 font-semibold'
                    : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                  }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom user pill */}
        <div className="mt-auto px-2">
          <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-3 py-3">
            <div className="w-8 h-8 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-bold text-sm">
              A
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">Student</p>
              <p className="text-xs text-gray-400">Free Plan</p>
            </div>
          </div>
        </div>

      </aside>

      {/* Right side */}
      <div className="ml-60 flex-1 flex flex-col">

        {/* Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
          <input
            type="text"
            placeholder="Search notes..."
            className="bg-gray-100 rounded-xl px-4 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-purple-300 transition"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <div className="w-9 h-9 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm cursor-pointer">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>

      </div>
    </div>
  )
}

export default Layout
