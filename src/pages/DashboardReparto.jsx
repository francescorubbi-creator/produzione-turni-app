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

  // --- Nuovo: stato per il form di inserimento riga ---
  const [formAperto, setFormAperto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroreForm, setErroreForm] = useState('')
  const [nuovaRiga, setNuovaRiga] = useState({
    codice_prodotto: '',
    data_produzione: '',
    quantita_kg: '',
    batch: '',
    settimana: '',
  })

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

  // --- Nuovo: salvataggio nuova riga ---
  async function salvaNuovaRiga(e) {
    e.preventDefault()
    setErroreForm('')

    if (!nuovaRiga.codice_prodotto || !nuovaRiga.data_produzione) {
      setErroreForm('Codice prodotto e data sono obbligatori.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('programmi_produzione').insert({
      reparto_id: reparto.id,
      codice_prodotto: nuovaRiga.codice_prodotto,
      data_produzione: nuovaRiga.data_produzione,
      quantita_kg: nuovaRiga.quantita_kg ? Number(nuovaRiga.quantita_kg) : null,
      batch: nuovaRiga.batch || null,
      settimana: nuovaRiga.settimana || null,
      stato: 'in_corso',
      controlli: {},
    })
    setSalvando(false)

    if (error) {
      setErroreForm('Errore nel salvataggio: ' + error.message)
      return
    }

    // La riga arriverà comunque via realtime, ma resettiamo subito il form
    setNuovaRiga({ codice_prodotto: '', data_produzione: '', quantita_kg: '', batch: '', settimana: '' })
    setFormAperto(false)
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
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setFormAperto(f => !f)}>
              {formAperto ? '✕ Annulla' : '+ Aggiungi riga'}
            </button>
          )}
          <button onClick={toggleNotte}>{notte ? '☀️ Modalita giorno' : '🌙 Modalita notte'}</button>
        </div>
      </header>

      {isAdmin && formAperto && (
        <form onSubmit={salvaNuovaRiga} style={{
          margin: '0 16px 16px', padding: 16, borderRadius: 12,
          border: '1px solid var(--bordo)', background: 'var(--bg-card)',
          display: 'grid', gap: 8, maxWidth: 420,
        }}>
          <label>
            Codice prodotto *
            <input
              value={nuovaRiga.codice_prodotto}
              onChange={e => setNuovaRiga({ ...nuovaRiga, codice_prodotto: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Data produzione *
            <input
              type="date"
              value={nuovaRiga.data_produzione}
              onChange={e => setNuovaRiga({ ...nuovaRiga, data_produzione: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Quantità (Kg)
            <input
              type="number"
              value={nuovaRiga.quantita_kg}
              onChange={e => setNuovaRiga({ ...nuovaRiga, quantita_kg: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Batch
            <input
              value={nuovaRiga.batch}
              onChange={e => setNuovaRiga({ ...nuovaRiga, batch: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Settimana
            <input
              value={nuovaRiga.settimana}
              onChange={e => setNuovaRiga({ ...nuovaRiga, settimana: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          {erroreForm && <p style={{ color: 'red' }}>{erroreForm}</p>}
          <button type="submit" disabled={salvando}>
            {salvando ? 'Salvataggio...' : 'Salva riga'}
          </button>
        </form>
      )}

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
