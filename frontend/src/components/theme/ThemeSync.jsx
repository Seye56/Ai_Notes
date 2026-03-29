import { useEffect } from 'react'
import { useUserStore } from '../../store/userStore'

const resolveTheme = (uiTheme) => {
  if (uiTheme === 'dark') {
    return 'dark'
  }
  if (uiTheme === 'light') {
    return 'light'
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const ThemeSync = () => {
  const uiTheme = useUserStore((state) => state.profile?.ui_theme ?? 'system')

  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = resolveTheme(uiTheme)
      document.documentElement.dataset.theme = nextTheme
    }

    applyTheme()

    if (uiTheme !== 'system') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [uiTheme])

  return null
}

export default ThemeSync
