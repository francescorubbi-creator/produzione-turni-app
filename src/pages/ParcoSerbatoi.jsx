import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const STATI = {
  libero: { colore: '#D9EAD3', etichetta: 'Libero' },
  occupato: { colore: '#F8D7DA', etichetta: 'Occupato' },
  lavaggio: { colore: '#FFF2CC', etichetta: 'In lavaggio' },
  manutenzione: { colore: '#F0BFFF', etichetta: 'Manutenzione' },
}

export default function ParcoSerbatoi() {
  const { isAdmin } = useAuth()
  const [serbatoi, setSerbatoi] = useState([])
  const [selezionato, setSelezionato] = useState(null)

  useEffect(() => {
    carica()
    const canale = supabase.channel('parco_serbatoi_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parco_serbatoi' }, carica)
      .subscribe()
    return () => supabase.removeChannel(canale)
  }, [])

  async function carica() {
    const { data } = await supabase.from('parco_serbatoi').select('*').order('nome')
    setSerbatoi(data || [])
  }

  async function aggiornaStato(id, stato, prodotto) {
    await supabase.from('parco_serbatoi').update({
      stato, prodotto_attuale: prodotto, updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSelezionato(null)
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Parco Serbatoi</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        {Object.entries(STATI).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 14, background: v.colore, borderRadius: 4, display: 'inline-block' }} />
            {v.etichetta}
          </span>
        ))}
      </div>

      <div style={{
        position: 'relative', width: '100%', maxWidth: 900, aspectRatio: '16/9',
        border: '1px solid var(--bordo)', borderRadius: 12, background: 'var(--bg-card)',
      }}>
        {serbatoi.map(s => (
          <button key={s.id}
            onClick={() => setSelezionato(s)}
            title={`${s.nome} — ${STATI[s.stato]?.etichetta}${s.prodotto_attuale ? ' — ' + s.prodotto_attuale : ''}`}
            style={{
              position: 'absolute',
              left: `${s.posizione_x ?? 50}%`, top: `${s.posizione_y ?? 50}%`,
              transform: 'translate(-50%, -50%)',
              width: 64, height: 64, borderRadius: '50%',
              background: STATI[s.stato]?.colore || '#ccc',
              border: '2px solid var(--bordo)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, textAlign: 'center', padding: 4,
            }}>
            {s.nome}
          </button>
        ))}
      </div>

      {selezionato && isAdmin && (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid var(--bordo)', borderRadius: 12, maxWidth: 340 }}>
          <h3>{selezionato.nome}</h3>
          <label>Stato</label>
          <select defaultValue={selezionato.stato} id="sel-stato" style={{ width: '100%', marginBottom: 8 }}>
            {Object.entries(STATI).map(([k, v]) => <option key={k} value={k}>{v.etichetta}</option>)}
          </select>
          <label>Prodotto attuale</label>
          <input defaultValue={selezionato.prodotto_attuale || ''} id="inp-prodotto" style={{ width: '100%', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => aggiornaStato(
              selezionato.id,
              document.getElementById('sel-stato').value,
              document.getElementById('inp-prodotto').value
            )}>Salva</button>
            <button onClick={() => setSelezionato(null)}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  )
}
