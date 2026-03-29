import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import { useUserStore } from '../store/userStore'

const Login = () => {
  const navigate = useNavigate()
  const { login, signup, loading } = useUserStore()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
  })

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      if (mode === 'signup') {
        const result = await signup(form)
        toast.success(result.message ?? 'Account created. You can log in now.')
        setMode('login')
        return
      }

      await login(form)
      toast.success('Welcome back.')
      navigate('/')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] panel lg:grid-cols-[1fr,1.1fr]">
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-300 p-10 text-white">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-violet-100">AI Notes</p>
            <h1 className="mt-6 text-4xl font-bold leading-tight">Notes, study tools, audio, and live collaboration in one place.</h1>
          </div>
          <div className="rounded-[28px] bg-white/15 p-6 backdrop-blur">
            <p className="text-sm leading-7 text-violet-50">
              Create notes, import files, summarize, translate, generate quizzes, listen with voice playback, and collaborate in live translated group rooms.
            </p>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="inline-flex rounded-full p-1" style={{ background: 'var(--surface-soft)' }}>
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === 'login' ? 'text-white' : 'text-muted'}`}
              style={mode === 'login' ? { background: 'var(--accent)' } : undefined}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === 'signup' ? 'text-white' : 'text-muted'}`}
              style={mode === 'signup' ? { background: 'var(--accent)' } : undefined}
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-3xl font-bold text-main">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {mode === 'login'
                ? 'Sign in to your workspace and pick up where you left off.'
                : 'Set up your study workspace and start using the backend features.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === 'signup' && (
              <input
                type="text"
                value={form.full_name}
                onChange={(event) => updateField('full_name', event.target.value)}
                placeholder="Full name"
                className="input-field"
              />
            )}
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="Email"
              className="input-field"
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="Password"
              className="input-field"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
