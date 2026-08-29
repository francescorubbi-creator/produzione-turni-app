import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './pages/Login'
import DashboardReparto from './pages/DashboardReparto'
import GeP from './pages/GeP'
import Turni from './pages/Turni'
import Ferie from './pages/Ferie'
import ParcoSerbatoi from './pages/ParcoSerbatoi'
import MatriceCompetenze from './pages/MatriceCompetenze'
import MappaSpogliatoio from './pages/MappaSpogliatoio'
import AuditLog from './pages/AuditLog'
import Noc from './pages/Noc'
import Lotti from './pages/Lotti'
import './styles/theme.css'

const REPARTI_MENU = [
  { codice: 'gel', label: 'Gel' }, { codice: 'creme', label: 'Creme' },
  { codice: 'mix', label: 'Mix' }, { codice: 'pid', label: 'Pid' },
]

function Navbar() {
  const { session, isAdmin, logout } = useAuth()
  if (!session) return null
  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--bordo)' }}>
      {REPARTI_MENU.map(r => <Link key={r.codice} to={`/reparto/${r.codice}`}>{r.label}</Link>)}
      <Link to="/gep">GeP</Link>
      <Link to="/noc">Noc</Link>
      <Link to="/lotti">Lotti</Link>
      <Link to="/turni">Turni</Link>
      <Link to="/ferie">Ferie</Link>
      <Link to="/serbatoi">Serbatoi</Link>
      <Link to="/competenze">Competenze</Link>
      <Link to="/spogliatoio">Spogliatoio</Link>
      {isAdmin && <Link to="/audit">Audit Log</Link>}
      <button onClick={logout} style={{ marginLeft: 'auto' }}>Esci</button>
    </nav>
  )
}

function RottaProtetta({ children, soloAdmin = false }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <div className="griglia-reparto">Caricamento...</div>
  if (!session) return <Navigate to="/login" replace />
  if (soloAdmin && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <RottaProtetta><DashboardReparto /></RottaProtetta>
            } />
            <Route path="/reparto/:codiceReparto" element={
              <RottaProtetta><DashboardReparto /></RottaProtetta>
            } />
            <Route path="/gep" element={
              <RottaProtetta><GeP /></RottaProtetta>
            } />
            <Route path="/noc" element={
              <RottaProtetta><Noc /></RottaProtetta>
            } />
            <Route path="/lotti" element={
              <RottaProtetta><Lotti /></RottaProtetta>
            } />
            <Route path="/turni" element={
              <RottaProtetta><Turni /></RottaProtetta>
            } />
            <Route path="/ferie" element={
              <RottaProtetta><Ferie /></RottaProtetta>
            } />
            <Route path="/serbatoi" element={
              <RottaProtetta><ParcoSerbatoi /></RottaProtetta>
            } />
            <Route path="/competenze" element={
              <RottaProtetta><MatriceCompetenze /></RottaProtetta>
            } />
            <Route path="/spogliatoio" element={
              <RottaProtetta><MappaSpogliatoio /></RottaProtetta>
            } />
            <Route path="/audit" element={
              <RottaProtetta soloAdmin><AuditLog /></RottaProtetta>
            } />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
