import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore(null)
    const { error } = await login(email, password)
    if (error) setErrore('Credenziali non valide.')
    else navigate('/')
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 24 }}>
      <h1>Accesso</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required
          style={{ width: '100%', padding: 12, marginBottom: 12 }} />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} required
          style={{ width: '100%', padding: 12, marginBottom: 12 }} />
        {errore && <p style={{ color: 'var(--stato-bloccato-testo)' }}>{errore}</p>}
        <button type="submit" style={{ width: '100%', padding: 12 }}>Entra</button>
      </form>
    </div>
  )
}
