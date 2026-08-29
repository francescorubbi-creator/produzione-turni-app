import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Lotti() {
  const [righe, setRighe] = useState([])
  const [ricerca, setRicerca] = useState('')

  useEffect(() => {
    async function carica() {
      const { data } = await supabase.from('calendario_lotti').select('*').order('data')
      setRighe(data || [])
    }
    carica()
  }, [])

  const filtrate = righe.filter(r =>
    !ricerca || r.numero_lotto.includes(ricerca) || r.data.includes(ricerca)
  )

  return (
    <div style={{ padding: 16 }}>
      <h1>Calendario Lotti 2027</h1>
      <input placeholder="Cerca per data o numero lotto..." value={ricerca}
        onChange={e => setRicerca(e.target.value)}
        style={{ padding: 8, marginBottom: 16, width: 280 }} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>Data</th><th>Numero Lotto</th></tr></thead>
        <tbody>
          {filtrate.map(r => (
            <tr key={r.data}><td>{r.data}</td><td>{r.numero_lotto}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
