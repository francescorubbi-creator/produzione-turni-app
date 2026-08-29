import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function DashboardReparto() {
  const { codiceReparto = 'gel' } = useParams()
  const { isAdmin } = useAuth()
  const { notte, toggleNotte } = useTheme()

  const [reparto, setReparto] = useState(null)
  const [controlli, setControlli] = useState([])
  const [righe, setRighe] = useState([])

  useEffect(() => {
    let canale

    async function carica() {
      const { data: rep } = await supabase.from('reparti').select('*').eq('codice', codiceReparto).single()
      setReparto(rep)
      if (!rep) return

      const { data: ctrl } = await supabase.from('controlli_reparto').select('*')
        .eq('reparto_id', rep.id).order('ordine')
      setControlli(ctrl || [])

      const { data: prog } = await supabase.from('programmi_produzione').select('*')
        .eq('reparto_id', rep.id).order('data_produzione')
      setRighe(prog || [])

      canale = supabase.channel(`programmi_${rep.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'programmi_produzione', filter: `reparto_id=eq.${rep.id}` },
          payload => {
            setRighe(prev => {
              if (payload.eventType === 'INSERT') return [...prev, payload.new]
              if (payload.eventType === 'UPDATE') return prev.map(r => r.id === payload.new.id ? payload.new : r)
              if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old.id)
              return prev
            })
          })
        .subscribe()
    }
    carica()
    return () => { if (canale) supabase.removeChannel(canale) }
  }, [codiceReparto])

  async function toggleControllo(riga, chiave) {
    if (!isAdmin) return
    const nuoviControlli = { ...riga.controlli, [chiave]: !riga.controlli?.[chiave] }
    const tutteFatte = controlli.length > 0 && controlli.every(c => nuoviControlli[c.chiave])
    await supabase.from('programmi_produzione').update({
      controlli: nuoviControlli,
      riga_completata: tutteFatte,
      stato: tutteFatte ? 'completato' : 'in_corso',
      updated_at: new Date().toISOString(),
    }).eq('id', riga.id)
  }

  const mediaSettimanale = useMemo(() => {
    if (!righe.length) return 0
    const tot = righe.reduce((s, r) => s + (r.quantita_kg || 0), 0)
    const settimane = new Set(righe.map(r => r.settimana)).size || 1
    return tot / settimane
  }, [righe])
  const superaSoglia = reparto?.soglia_media_settimanale && mediaSettimanale > reparto.soglia_media_settimanale

  if (!reparto) return <p>Caricamento reparto...</p>

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <h1 style={{ color: reparto.colore_tema }}>{reparto.nome}</h1>
        <button onClick={toggleNotte}>{notte ? '☀️ Modalita giorno' : '🌙 Modalita notte'}</button>
      </header>

      {superaSoglia && (
        <div className="badge-stato" data-stato="bloccato" style={{ margin: '0 16px 16px' }}>
          ⚠️ Media settimanale ({mediaSettimanale.toFixed(0)} Kg) sopra la soglia di {reparto.soglia_media_settimanale} Kg
        </div>
      )}

      <div className="griglia-reparto">
        {righe.map(riga => (
          <div key={riga.id} className="bg-card" style={{
            background: 'var(--bg-card)', border: '1px solid var(--bordo)',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{riga.codice_prodotto}</strong>
              <span className="badge-stato" data-stato={riga.stato}>{riga.stato}</span>
            </div>
            <p style={{ color: 'var(--testo-secondario)' }}>
              {riga.data_produzione} · {riga.quantita_kg ?? '—'} Kg · Batch {riga.batch ?? '—'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {controlli.map(c => (
                <button key={c.chiave} className="chip-controllo"
                  onClick={() => toggleControllo(riga, c.chiave)}
                  style={{
                    padding: '6px 10px', borderRadius: 8,
                    background: riga.controlli?.[c.chiave] ? 'var(--stato-completato)' : 'var(--bg)',
                    border: '1px solid var(--bordo)',
                  }}>
                  {riga.controlli?.[c.chiave] ? '✓' : '○'} {c.etichetta}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
