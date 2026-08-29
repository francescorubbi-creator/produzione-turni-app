import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

const LIVELLI = ['si', 'no', 'in_formazione', 'in_previsione']
const COLORE = {
  si: 'var(--stato-completato)', no: 'var(--bg)',
  in_formazione: 'var(--stato-in-corso)', in_previsione: 'var(--turno-mattina)',
}

export default function MatriceCompetenze() {
  const { isAdmin } = useAuth()
  const [operatori, setOperatori] = useState([])
  const [linee, setLinee] = useState([])
  const [competenze, setCompetenze] = useState({})

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data: ops } = await supabase.from('profili').select('id, nome, cognome').order('cognome')
    const { data: lns } = await supabase.from('linee_competenza').select('*, reparti(nome)').order('nome')
    const { data: comp } = await supabase.from('competenze').select('*')
    setOperatori(ops || [])
    setLinee(lns || [])
    const mappa = {}
    for (const c of comp || []) mappa[`${c.operatore_id}_${c.linea_id}`] = c
    setCompetenze(mappa)
  }

  async function cambiaLivello(operatoreId, lineaId) {
    if (!isAdmin) return
    const chiave = `${operatoreId}_${lineaId}`
    const attuale = competenze[chiave]
    const prossimoIndex = (LIVELLI.indexOf(attuale?.livello) + 1) % LIVELLI.length
    const nuovoLivello = LIVELLI[prossimoIndex]

    const { data } = await supabase.from('competenze')
      .upsert({ id: attuale?.id, operatore_id: operatoreId, linea_id: lineaId, livello: nuovoLivello },
               { onConflict: 'operatore_id,linea_id' })
      .select().single()

    setCompetenze(prev => ({ ...prev, [chiave]: data }))
  }

  return (
    <div style={{ padding: 16, overflowX: 'auto' }}>
      <h1>Matrice Competenze</h1>
      <p style={{ color: 'var(--testo-secondario)' }}>
        {isAdmin ? 'Tocca una cella per far avanzare il livello (No → In formazione → In previsione → Sì).' : 'Sola lettura.'}
      </p>
      <table style={{ borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: 'var(--bg)' }}>Operatore</th>
            {linee.map(l => <th key={l.id} style={{ minWidth: 90, fontSize: 12 }}>{l.nome}<br />
              <small style={{ color: 'var(--testo-secondario)' }}>{l.reparti?.nome}</small></th>)}
          </tr>
        </thead>
        <tbody>
          {operatori.map(op => (
            <tr key={op.id}>
              <td style={{ position: 'sticky', left: 0, background: 'var(--bg)', fontWeight: 600 }}>
                {op.cognome} {op.nome}
              </td>
              {linee.map(l => {
                const c = competenze[`${op.id}_${l.id}`]
                return (
                  <td key={l.id} onClick={() => cambiaLivello(op.id, l.id)}
                    className="cella-interattiva"
                    style={{
                      background: COLORE[c?.livello || 'no'],
                      textAlign: 'center', cursor: isAdmin ? 'pointer' : 'default',
                      border: '1px solid var(--bordo)', fontSize: 11,
                    }}>
                    {c?.livello?.replace('_', ' ') || 'no'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
