import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function MappaSpogliatoio() {
  const { isAdmin } = useAuth()
  const [armadietti, setArmadietti] = useState([])
  const [operatori, setOperatori] = useState([])
  const [selezionato, setSelezionato] = useState(null)

  useEffect(() => {
    carica()
    const canale = supabase.channel('armadietti_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'armadietti' }, carica)
      .subscribe()
    return () => supabase.removeChannel(canale)
  }, [])

  async function carica() {
    const { data: arm } = await supabase.from('armadietti').select('*, profili(nome, cognome)').order('numero')
    const { data: ops } = await supabase.from('profili').select('id, nome, cognome').order('cognome')
    setArmadietti(arm || [])
    setOperatori(ops || [])
  }

  async function assegna(armadiettoId, operatoreId) {
    await supabase.from('armadietti').update({ operatore_id: operatoreId || null }).eq('id', armadiettoId)
    setSelezionato(null)
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Spogliatoio — Assegnazione Armadietti</h1>
      <div className="griglia-reparto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        {armadietti.map(a => (
          <button key={a.id} className="cella-interattiva"
            onClick={() => isAdmin && setSelezionato(a)}
            style={{
              padding: 10, borderRadius: 8, textAlign: 'left',
              background: a.operatore_id ? 'var(--stato-completato)' : 'var(--bg-card)',
              border: `2px solid ${a.colore_etichetta || 'var(--bordo)'}`,
              cursor: isAdmin ? 'pointer' : 'default',
            }}>
            <strong>#{a.numero}</strong>
            <div style={{ fontSize: 12, color: 'var(--testo-secondario)' }}>{a.zona}</div>
            <div style={{ fontSize: 13 }}>
              {a.profili ? `${a.profili.cognome} ${a.profili.nome}` : '— libero —'}
            </div>
          </button>
        ))}
      </div>

      {selezionato && (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--bordo)', borderRadius: 12, maxWidth: 340 }}>
          <h3>Armadietto #{selezionato.numero}</h3>
          <select defaultValue={selezionato.operatore_id || ''} id="sel-op" style={{ width: '100%', marginBottom: 8 }}>
            <option value="">— nessuno —</option>
            {operatori.map(o => <option key={o.id} value={o.id}>{o.cognome} {o.nome}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => assegna(selezionato.id, document.getElementById('sel-op').value)}>Salva</button>
            <button onClick={() => setSelezionato(null)}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  )
}
