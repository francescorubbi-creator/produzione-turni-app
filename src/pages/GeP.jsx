import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function GeP() {
  const [righe, setRighe] = useState([])

  useEffect(() => { carica() }, [])

  async function carica() {
    const { data } = await supabase
      .from('v_tempi_ricettazione')
      .select('*, programmi_produzione(codice_prodotto, data_produzione, reparto_id)')
      .order('programma_id')
    setRighe(data || [])
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Gelati Operatori — Tempistiche Ricette</h1>
      <p style={{ color: 'var(--testo-secondario)' }}>
        Base 2h a turno + tempo per ogni ingrediente micro/macro (configurabile in Impostazioni Reparto).
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Prodotto</th><th>Data</th>
            <th>N° Micro</th><th>N° Macro</th>
            <th>Tempo totale</th>
          </tr>
        </thead>
        <tbody>
          {righe.map(r => (
            <tr key={r.fdl_id}>
              <td>{r.programmi_produzione?.codice_prodotto}</td>
              <td>{r.programmi_produzione?.data_produzione}</td>
              <td>{r.n_ingredienti_micro}</td>
              <td>{r.n_ingredienti_macro}</td>
              <td>
                <strong>{Math.floor(r.tempo_totale_minuti / 60)}h {r.tempo_totale_minuti % 60}m</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {righe.length === 0 && (
        <p style={{ color: 'var(--testo-secondario)' }}>
          Nessun batch ancora inserito. Le righe compaiono qui non appena si aggiunge un batch
          in F.D.L. collegato a un programma di produzione GeP.
        </p>
      )}
    </div>
  )
}
