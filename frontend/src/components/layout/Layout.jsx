import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Brain, FileText, LogOut, Settings, Users } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { useUserStore } from '../../store/userStore'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: Brain },
  { to: '/notes', label: 'My Notes', icon: FileText },
  { to: '/groups', label: 'Groups', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, initialized, hydrateSession, logout } = useUserStore()

  useEffect(() => {
    hydrateSession()
  }, [hydrateSession])

  useEffect(() => {
    if (initialized && !profile) {
      navigate('/login')
    }
  }, [initialized, navigate, profile])

  if (!initialized) {
    return <div className="app-shell min-h-screen flex items-center justify-center text-muted">Loading your workspace...</div>
  }

  return (
    <div className="app-shell min-h-screen flex">
      <Toaster position="top-right" />

      <aside className="sidebar-shell fixed left-0 top-0 h-full w-64 flex flex-col py-6 px-4 z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-main block leading-tight">AI Notes</span>
            <span className="text-xs text-muted">Study smarter, together</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`)
            return (
              <Link
                key={to}
                to={to}
                className={`nav-link flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition ${
                  isActive
                    ? 'nav-link-active font-semibold'
                    : ''
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="rounded-3xl p-4 text-white shadow-lg shadow-violet-200" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #ec4899 100%)' }}>
          <p className="text-xs uppercase tracking-[0.2em] text-violet-100">Focus mode</p>
          <p className="mt-2 text-sm font-medium leading-6">
            Summaries, quizzes, speech and live collaboration are all connected to your backend now.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
            <BookOpen size={14} />
            Ready to study
          </div>
        </div>

        <div className="mt-auto px-2 pt-6">
          <div className="sidebar-pill flex items-center gap-3 rounded-2xl px-3 py-3">
            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-800 font-bold text-sm">
              {profile?.full_name?.[0] ?? profile?.email?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-main truncate">{profile?.full_name || 'Student'}</p>
              <p className="text-xs text-muted truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium text-soft hover:bg-[var(--accent-soft)]"
            style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="flex h-18 items-center justify-between px-8 sticky top-0 z-10 backdrop-blur border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border-soft)' }}>
          <div>
            <p className="text-sm text-muted">Workspace</p>
            <p className="text-base font-semibold text-main">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-soft">{profile?.preferred_language?.toUpperCase() || 'EN'}</p>
            <p className="text-xs text-muted">Default study language</p>
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
