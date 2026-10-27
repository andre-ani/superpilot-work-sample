import { createContext, useContext } from 'react'

/** Carries a local theme through Radix portals without changing the page theme. */
export const ThemeScope = createContext<'dark' | undefined>(undefined)
export const useThemeScope = () => useContext(ThemeScope)
