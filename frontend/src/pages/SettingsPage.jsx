import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../components/ui/Button'
import { useUserStore } from '../store/userStore'
import { useStudyStore } from '../store/studyStore'
import { languageOptions } from '../utils/languageMap'

const SettingsPage = () => {
  const { profile, refreshProfile, updateProfile, loading } = useUserStore()
  const { voices, initializeSpeechOptions } = useStudyStore()
  const [form, setForm] = useState({
    full_name: '',
    preferred_language: 'en',
    preferred_voice: '',
    ui_theme: 'system',
  })

  useEffect(() => {
    refreshProfile().catch(() => {})
    initializeSpeechOptions()
  }, [initializeSpeechOptions, refreshProfile])

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        preferred_language: profile.preferred_language ?? 'en',
        preferred_voice: profile.preferred_voice ?? '',
        ui_theme: profile.ui_theme ?? 'system',
      })
    }
  }, [profile])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-main">Settings</h1>
        <p className="text-sm text-muted">Manage your default language, voice, and profile preferences.</p>
      </div>

      <div className="panel rounded-[28px] p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={form.full_name}
            onChange={(event) => updateField('full_name', event.target.value)}
            className="input-field"
            placeholder="Full name"
          />
          <input
            value={profile?.email ?? ''}
            readOnly
            className="input-field !bg-[var(--surface-soft)] !text-[var(--text-muted)]"
          />
          <select
            value={form.preferred_language}
            onChange={(event) => updateField('preferred_language', event.target.value)}
            className="select-field"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={form.preferred_voice}
            onChange={(event) => updateField('preferred_voice', event.target.value)}
            className="select-field"
          >
            <option value="">Use app default voice</option>
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
                {voice.metadata?.gender ? ` (${voice.metadata.gender})` : ''}
              </option>
            ))}
          </select>
        </div>

        <select
          value={form.ui_theme}
          onChange={(event) => updateField('ui_theme', event.target.value)}
          className="select-field"
        >
          <option value="system">system</option>
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>

        <Button
          onClick={async () => {
            try {
              await updateProfile(form)
              toast.success('Settings saved.')
            } catch (error) {
              toast.error(error.message)
            }
          }}
          disabled={loading}
        >
          Save settings
        </Button>
      </div>
    </div>
  )
}

export default SettingsPage
