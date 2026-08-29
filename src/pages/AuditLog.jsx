import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ETICHETTA_AZIONE = { insert: 'Creazione', update: 'Modifica', delete: 'Cancellazione' }

export default function AuditLog() {
  const [voci, setVoci] = useState([])
  const [filtroTabella, setFiltroTabella] = useState('')

  useEffect(() => { carica() }, [filtroTabella])

  async function carica() {
    let query = supabase.from('audit_log')
      .select('*, profili(nome, cognome)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filtroTabella) query = query.eq('tabella', filtroTabella)
    const { data } = await query
    setVoci(data || [])
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Registro Modifiche (Audit Log)</h1>
      <select value={filtroTabella} onChange={e => setFiltroTabella(e.target.value)} style={{ marginBottom: 16 }}>
        <option value="">Tutte le tabelle</option>
        <option value="programmi_produzione">Programmi Produzione</option>
        <option value="turni">Turni</option>
        <option value="richieste_assenza">Richieste Assenza</option>
        <option value="kit_bancali">Kit e Bancali</option>
      </select>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Data/Ora</th><th>Utente</th><th>Tabella</th><th>Azione</th></tr>
        </thead>
        <tbody>
          {voci.map(v => (
            <tr key={v.id}>
              <td>{new Date(v.created_at).toLocaleString('it-IT')}</td>
              <td>{v.profili ? `${v.profili.cognome} ${v.profili.nome}` : 'Sistema'}</td>
              <td>{v.tabella}</td>
              <td>
                <span className="badge-stato" data-stato={
                  v.azione === 'insert' ? 'completato' : v.azione === 'delete' ? 'bloccato' : 'in_corso'
                }>{ETICHETTA_AZIONE[v.azione]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
