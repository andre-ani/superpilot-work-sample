import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export const themeStorageKey = 'superpilot-theme-v1'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    setDark(next)
    try {
      localStorage.setItem(themeStorageKey, next ? 'dark' : 'light')
    } catch {
      // The toggle still works when the browser blocks persistent storage.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}
      aria-label="Dark mode" aria-pressed={dark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <IconSun aria-hidden="true" /> : <IconMoon aria-hidden="true" />}
    </Button>
  )
}
