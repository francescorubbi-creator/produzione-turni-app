import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

// Prova a trovare un'etichetta leggibile per un prodotto, qualunque sia
// il nome esatto delle colonne nella tabella "prodotti".
function etichettaProdotto(p) {
  const nome = p.nome_prodotto ?? p.nome ?? p.descrizione ?? null
  const codice = p.codice_pf ?? p.codice ?? p.codice_prodotto ?? null
  if (nome && codice) return `${codice} — ${nome}`
  return nome ?? codice ?? p.id
}

export default function DashboardReparto() {
  const { codiceReparto = 'gel' } = useParams()
  const { isAdmin } = useAuth()
  const { notte, toggleNotte } = useTheme()

  const [reparto, setReparto] = useState(null)
  const [controlli, setControlli] = useState([])
  const [righe, setRighe] = useState([])
  const [prodotti, setProdotti] = useState([])

  // --- stato per il form di inserimento riga ---
  const [formAperto, setFormAperto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroreForm, setErroreForm] = useState('')
  const [nuovaRiga, setNuovaRiga] = useState({
    prodotto_id: '',
    settimana: '',
    data_ordine: '',
    data_produzione: '',
    batch: '',
    lotto: '',
    linea: '',
    note: '',
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

      // Elenco prodotti per il menu a tendina del form (select('*') per non
      // dipendere dai nomi esatti delle colonne).
      const { data: prods } = await supabase.from('prodotti').select('*')
      setProdotti(prods || [])

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

  // --- salvataggio nuova riga, allineato allo schema reale della tabella ---
  async function salvaNuovaRiga(e) {
    e.preventDefault()
    setErroreForm('')

    if (!nuovaRiga.data_produzione || !nuovaRiga.settimana) {
      setErroreForm('Data produzione e settimana sono obbligatorie.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('programmi_produzione').insert({
      reparto_id: reparto.id,
      prodotto_id: nuovaRiga.prodotto_id || null,
      settimana: Number(nuovaRiga.settimana),
      data_ordine: nuovaRiga.data_ordine || null,
      data_produzione: nuovaRiga.data_produzione,
      batch: nuovaRiga.batch || null,
      lotto: nuovaRiga.lotto || null,
      linea: nuovaRiga.linea || null,
      note: nuovaRiga.note || null,
      quantita_kg: null,
      stato: 'in_corso',
      riga_completata: false,
      is_festivo: false,
      controlli: {},
    })
    setSalvando(false)

    if (error) {
      setErroreForm('Errore nel salvataggio: ' + error.message)
      return
    }

    setNuovaRiga({
      prodotto_id: '', settimana: '', data_ordine: '', data_produzione: '',
      batch: '', lotto: '', linea: '', note: '',
    })
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
            Prodotto
            <select
              value={nuovaRiga.prodotto_id}
              onChange={e => setNuovaRiga({ ...nuovaRiga, prodotto_id: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">— seleziona —</option>
              {prodotti.map(p => (
                <option key={p.id} value={p.id}>{etichettaProdotto(p)}</option>
              ))}
            </select>
          </label>
          <label>
            Settimana *
            <input
              type="number"
              value={nuovaRiga.settimana}
              onChange={e => setNuovaRiga({ ...nuovaRiga, settimana: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Data ordine
            <input
              type="date"
              value={nuovaRiga.data_ordine}
              onChange={e => setNuovaRiga({ ...nuovaRiga, data_ordine: e.target.value })}
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
            Batch
            <input
              value={nuovaRiga.batch}
              onChange={e => setNuovaRiga({ ...nuovaRiga, batch: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Lotto
            <input
              value={nuovaRiga.lotto}
              onChange={e => setNuovaRiga({ ...nuovaRiga, lotto: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Linea
            <input
              value={nuovaRiga.linea}
              onChange={e => setNuovaRiga({ ...nuovaRiga, linea: e.target.value })}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Note
            <input
              value={nuovaRiga.note}
              onChange={e => setNuovaRiga({ ...nuovaRiga, note: e.target.value })}
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
              <strong>{riga.codice_prodotto ?? riga.prodotto_id ?? '—'}</strong>
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
