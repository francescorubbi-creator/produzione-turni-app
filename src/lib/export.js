import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export function esportaTurniPDF(turni, mese) {
  const doc = new jsPDF()
  doc.text(`Turni - Mese ${mese} 2027`, 14, 16)
  autoTable(doc, {
    startY: 22,
    head: [['Data', 'Operatore', 'Turno']],
    body: turni.map(t => [t.data, `${t.profili?.cognome} ${t.profili?.nome}`, t.tipi_turno?.descrizione]),
  })
  doc.save(`turni_${mese}_2027.pdf`)
}

export function esportaTurniExcel(turni, mese) {
  const rows = turni.map(t => ({
    Data: t.data,
    Operatore: `${t.profili?.cognome} ${t.profili?.nome}`,
    Turno: t.tipi_turno?.descrizione,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Turni')
  XLSX.writeFile(wb, `turni_${mese}_2027.xlsx`)
}

export function esportaProgrammiPDF(righe, nomeReparto) {
  const doc = new jsPDF()
  doc.text(`Programma Produzione - ${nomeReparto}`, 14, 16)
  autoTable(doc, {
    startY: 22,
    head: [['Data', 'Codice', 'Qta (Kg)', 'Batch', 'Stato']],
    body: righe.map(r => [r.data_produzione, r.codice_prodotto, r.quantita_kg, r.batch, r.stato]),
  })
  doc.save(`programma_${nomeReparto}.pdf`)
}

export function esportaProgrammiExcel(righe, nomeReparto) {
  const ws = XLSX.utils.json_to_sheet(righe)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, nomeReparto)
  XLSX.writeFile(wb, `programma_${nomeReparto}.xlsx`)
}
