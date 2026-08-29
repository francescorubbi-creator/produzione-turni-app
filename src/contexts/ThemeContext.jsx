import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [notte, setNotte] = useState(() => {
    const salvato = localStorage.getItem('tema_notte')
    if (salvato !== null) return salvato === 'true'
    const ora = new Date().getHours()
    return ora >= 20 || ora < 6
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', notte ? 'notte' : 'giorno')
    localStorage.setItem('tema_notte', notte)
  }, [notte])

  return (
    <ThemeContext.Provider value={{ notte, toggleNotte: () => setNotte(n => !n) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
