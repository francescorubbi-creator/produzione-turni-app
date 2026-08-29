import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function Ferie() {
  const { profilo, isAdmin } = useAuth()
  const [richieste, setRichieste] = useState([])
  const [form, setForm] = useState({ tipo: 'ferie', data_inizio: '', data_fine: '', note: '' })

  useEffect(() => { carica() }, [])

  async function carica() {
    let query = supabase.from('richieste_assenza').select('*, profili(nome, cognome)').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('operatore_id', profilo.id)
    const { data } = await query
    setRichieste(data || [])
  }

  async function invia(e) {
    e.preventDefault()
    await supabase.from('richieste_assenza').insert({
      operatore_id: profilo.id,
      richiesta_da: profilo.id,
      ...form,
    })
    const { data: admins } = await supabase.from('profili').select('id').eq('ruolo', 'admin')
    for (const a of admins || []) {
      await supabase.from('notifiche').insert({
        destinatario_id: a.id,
        tipo: 'richiesta_ferie',
        messaggio: `${profilo.cognome} ${profilo.nome} ha richiesto ${form.tipo} dal ${form.data_inizio} al ${form.data_fine}`,
      })
    }
    setForm({ tipo: 'ferie', data_inizio: '', data_fine: '', note: '' })
    carica()
  }

  async function decidi(id, stato) {
    await supabase.from('richieste_assenza').update({
      stato, approvata_da: profilo.id, data_decisione: new Date().toISOString(),
    }).eq('id', id)
    carica()
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Ferie, Permessi e Straordinari</h1>

      {!isAdmin && (
        <form onSubmit={invia} style={{ marginBottom: 24, display: 'grid', gap: 8, maxWidth: 400 }}>
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            <option value="ferie">Ferie</option>
            <option value="rol">ROL</option>
            <option value="straordinario">Straordinario</option>
            <option value="legge_104">Legge 104</option>
          </select>
          <input type="date" value={form.data_inizio} required
            onChange={e => setForm({ ...form, data_inizio: e.target.value })} />
          <input type="date" value={form.data_fine} required
            onChange={e => setForm({ ...form, data_fine: e.target.value })} />
          <textarea placeholder="Note" value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })} />
          <button type="submit">Invia richiesta</button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {isAdmin && <th>Operatore</th>}
            <th>Tipo</th><th>Dal</th><th>Al</th><th>Stato</th>
            {isAdmin && <th>Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {richieste.map(r => (
            <tr key={r.id}>
              {isAdmin && <td>{r.profili?.cognome} {r.profili?.nome}</td>}
              <td>{r.tipo}</td><td>{r.data_inizio}</td><td>{r.data_fine}</td>
              <td><span className="badge-stato" data-stato={
                r.stato === 'approvata' ? 'completato' : r.stato === 'rifiutata' ? 'bloccato' : 'in_corso'
              }>{r.stato}</span></td>
              {isAdmin && r.stato === 'richiesta' && (
                <td>
                  <button onClick={() => decidi(r.id, 'approvata')}>Approva</button>
                  <button onClick={() => decidi(r.id, 'rifiutata')}>Rifiuta</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
