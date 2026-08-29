import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ETICHETTE_TIPO = {
  pasta_nocciola: 'Pasta Nocciola',
  pistacchio_cioccolato: 'P. Pistacchio Cioccolato',
  pistacchio_mlg: 'P. Pistacchio MLG',
  intero_granella: 'Intero/Granella',
}

export default function Noc() {
  const [lotti, setLotti] = useState([])

  useEffect(() => {
    async function carica() {
      const { data } = await supabase.from('lotti_nocciole').select('*').order('data')
      setLotti(data || [])
    }
    carica()
  }, [])

  const perLotto = lotti.reduce((acc, r) => {
    const chiave = `${r.data}_${r.numero_lotto}`
    acc[chiave] = acc[chiave] || { data: r.data, numero_lotto: r.numero_lotto, righe: [] }
    acc[chiave].righe.push(r)
    return acc
  }, {})

  return (
    <div style={{ padding: 16 }}>
      <h1>Nocciole</h1>
      <div className="griglia-reparto">
        {Object.values(perLotto).map(gruppo => (
          <div key={gruppo.numero_lotto} style={{
            background: 'var(--bg-card)', border: '1px solid var(--bordo)',
            borderRadius: 12, padding: 16,
          }}>
            <strong>{gruppo.data} — Lotto {gruppo.numero_lotto}</strong>
            {gruppo.righe.map(r => (
              <div key={r.id} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--bordo)' }}>
                <div style={{ fontWeight: 600 }}>{ETICHETTE_TIPO[r.tipo_prodotto]}</div>
                <div style={{ fontSize: 13, color: 'var(--testo-secondario)' }}>
                  {r.quantita_kg != null && <>Qtà {r.quantita_kg} Kg · </>}
                  {r.sale_kg != null && <>Sale {r.sale_kg} Kg · </>}
                  {r.mp && <>MP {r.mp} · </>}
                  {r.linea && <>Linea {r.linea} · </>}
                  {r.tank && <>Tank {r.tank} · </>}
                  {r.lavaggio_kg != null && <>Lavaggio {r.lavaggio_kg} Kg · </>}
                  {r.comek && <>Comek {r.comek}</>}
                </div>
                {r.note && <div style={{ fontSize: 12, fontStyle: 'italic' }}>{r.note}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
      {lotti.length === 0 && (
        <p style={{ color: 'var(--testo-secondario)' }}>Nessun lotto ancora inserito per il 2027.</p>
      )}
    </div>
  )
}
