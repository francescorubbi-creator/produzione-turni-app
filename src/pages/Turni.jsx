import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { esportaTurniPDF, esportaTurniExcel } from '../lib/export'

export default function Turni() {
  const [turni, setTurni] = useState([])
  const [mese, setMese] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    async function carica() {
      const inizio = `2027-${String(mese).padStart(2, '0')}-01`
      const fine = `2027-${String(mese).padStart(2, '0')}-31`
      const { data } = await supabase.from('turni')
        .select('*, profili(nome, cognome), tipi_turno(descrizione, colore)')
        .gte('data', inizio).lte('data', fine)
        .order('data')
      setTurni(data || [])
    }
    carica()
  }, [mese])

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Turni</h1>
        <div>
          <button onClick={() => esportaTurniPDF(turni, mese)}>Esporta PDF</button>
          <button onClick={() => esportaTurniExcel(turni, mese)}>Esporta Excel</button>
        </div>
      </header>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Data</th><th>Operatore</th><th>Turno</th></tr>
        </thead>
        <tbody>
          {turni.map(t => (
            <tr key={t.id} style={{ background: t.tipi_turno?.colore }}>
              <td>{t.data}</td>
              <td>{t.profili?.cognome} {t.profili?.nome}</td>
              <td>{t.tipi_turno?.descrizione}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
