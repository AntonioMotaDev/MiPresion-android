// Hoja para el doctor: PDF blanco y negro, tamaño carta, sin importar el tema de la app.
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { shareFile } from './share.js';
import { formatDateShort, formatDateFull, formatTime24, pdfSafe } from './logic/report.js';

const M = 16; // margen en mm
const INK = 0;
const GRID = 60;

export function createReportPdf(report, { name, withNotes }) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  doc.setTextColor(INK);

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('REGISTRO DE PRESIÓN ARTERIAL', W / 2, M + 6, { align: 'center' });

  let y = M + 18;
  doc.setFontSize(12);
  doc.text('Nombre:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfSafe(name), M + 20, y);
  doc.setDrawColor(INK);
  doc.setLineWidth(0.3);
  doc.line(M + 19, y + 1.5, W - M, y + 1.5);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Periodo:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`del ${formatDateFull(report.rangeFrom)} al ${formatDateFull(report.rangeTo)}`, M + 20, y);

  // Tabla agrupada por día: la fecha aparece una vez por día.
  const head = [['Fecha', 'Hora', 'Sistólica\n(alta)', 'Diastólica\n(baja)', 'Pulso', ...(withNotes ? ['Notas'] : [])]];
  const body = [];
  for (const day of report.days) {
    day.readings.forEach((r, i) => {
      const row = [];
      if (i === 0) row.push({ content: formatDateShort(day.ts), rowSpan: day.readings.length, styles: { valign: 'middle', fontStyle: 'bold' } });
      row.push(formatTime24(r.ts), String(r.sys), String(r.dia), r.pul ? String(r.pul) : '-');
      if (withNotes) row.push(pdfSafe(r.note));
      body.push(row);
    });
  }

  const numCol = { halign: 'center' };
  const columnStyles = withNotes
    ? { 0: { cellWidth: 27 }, 1: { cellWidth: 17, ...numCol }, 2: { cellWidth: 23, ...numCol }, 3: { cellWidth: 23, ...numCol }, 4: { cellWidth: 17, ...numCol }, 5: { cellWidth: 'auto' } }
    : { 0: { cellWidth: 'auto' }, 1: numCol, 2: numCol, 3: numCol, 4: numCol };

  autoTable(doc, {
    startY: y + 7,
    margin: { left: M, right: M, bottom: M + 8 },
    head,
    body,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 11, textColor: INK, lineColor: GRID, lineWidth: 0.25, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: 235, textColor: INK, fontStyle: 'bold', halign: 'center', valign: 'middle' },
    bodyStyles: { fillColor: 255 },
    columnStyles,
    rowPageBreak: 'avoid',
  });

  // Promedio del periodo
  const a = report.average;
  y = doc.lastAutoTable.finalY + 10;
  if (y > doc.internal.pageSize.getHeight() - M - 20) {
    doc.addPage();
    y = M + 8;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Promedio del periodo:', M, y);
  doc.setFont('helvetica', 'normal');
  const parts = [`${a.sys}/${a.dia} mmHg`];
  if (a.pul) parts.push(`pulso ${a.pul}`);
  parts.push(`${report.count} ${report.count === 1 ? 'medición' : 'mediciones'}`);
  doc.text(parts.join('   ·   '), M + 50, y);

  // Pie de página
  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Página ${i} de ${pages}`, W - M, H - M + 4, { align: 'right' });
  }
  return doc;
}

export function sharePdf(doc, fileName) {
  const base64 = doc.output('datauristring').split(',')[1];
  return shareFile(fileName, { base64 }, { title: 'Registro de presión arterial', mime: 'application/pdf' });
}
