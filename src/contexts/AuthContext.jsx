import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profilo, setProfilo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) caricaProfilo(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) caricaProfilo(session.user.id)
      else { setProfilo(null); setLoading(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function caricaProfilo(userId) {
    const { data } = await supabase.from('profili').select('*').eq('id', userId).single()
    setProfilo(data)
    setLoading(false)
  }

  const isAdmin = profilo?.ruolo === 'admin'

  const value = {
    session,
    profilo,
    isAdmin,
    loading,
    login: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    logout: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
