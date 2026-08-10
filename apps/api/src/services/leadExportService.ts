/**
 * Lead CRM — filtrlangan lidlar ro'yxatini Excel/CSV/PDF/Word formatida
 * eksport qilish. Har doim SERVER tomonida generatsiya qilinadi (frontend
 * cheksiz yozuvni brauzer xotirasiga yuklamaydi) va faqat chaqiruvchi
 * o'tkazgan (filtrlangan) `LeadListItem[]` massividan foydalanadi —
 * "Export ONLY the currently filtered leads" talabi shu orqali bajariladi.
 */
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel } from 'docx'
import type { LeadListItem } from './leadService'

export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'docx'

const REGISTRATION_LABELS: Record<string, string> = {
  TELEGRAM: 'Telegram', GOOGLE: 'Google', PHONE: 'Telefon', UNKNOWN: "Noma'lum",
}

interface ExportRow {
  leadId: string
  name: string
  phone: string
  email: string
  registrationMethod: string
  registrationDate: string
  region: string
  city: string
  goal: string
  direction: string
  selectedCenter: string
  status: string
  priority: string
  lastActivity: string
}

const COLUMNS: Array<{ key: keyof ExportRow; header: string; width: number }> = [
  { key: 'leadId', header: 'Lead ID', width: 22 },
  { key: 'name', header: 'Ism', width: 20 },
  { key: 'phone', header: 'Telefon', width: 16 },
  { key: 'email', header: 'Email', width: 24 },
  { key: 'registrationMethod', header: "Ro'yxatdan o'tish usuli", width: 16 },
  { key: 'registrationDate', header: "Ro'yxatdan o'tgan sana", width: 18 },
  { key: 'region', header: 'Viloyat', width: 16 },
  { key: 'city', header: 'Shahar', width: 16 },
  { key: 'goal', header: 'Maqsad', width: 24 },
  { key: 'direction', header: "Yo'nalish", width: 18 },
  { key: 'selectedCenter', header: 'Tanlangan markaz', width: 24 },
  { key: 'status', header: 'Lid holati', width: 20 },
  { key: 'priority', header: 'Ustuvorlik', width: 12 },
  { key: 'lastActivity', header: 'Oxirgi faollik', width: 18 },
]

function fmtDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' })
}

function toRow(lead: LeadListItem): ExportRow {
  return {
    leadId: lead.id,
    name: lead.name ?? '—',
    phone: lead.phone ?? '—',
    email: lead.email ?? '—',
    registrationMethod: REGISTRATION_LABELS[lead.registrationMethod] ?? lead.registrationMethod,
    registrationDate: fmtDate(lead.createdAt),
    region: lead.city?.region?.nameUz ?? '—',
    city: lead.city?.nameUz ?? '—',
    goal: lead.goal ?? '—',
    direction: lead.direction ?? '—',
    selectedCenter: lead.selectedCenter ?? '—',
    status: lead.leadStatus,
    priority: lead.priority,
    lastActivity: fmtDate(lead.lastActiveAt),
  }
}

// ─── CSV ──────────────────────────────────────────────────────

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function exportToCsv(rows: ExportRow[]): Buffer {
  const header = COLUMNS.map((c) => csvEscape(c.header)).join(',')
  const lines = rows.map((r) => COLUMNS.map((c) => csvEscape(String(r[c.key]))).join(','))
  // BOM — Excel'da o'zbekcha/kirillcha harflar to'g'ri ko'rinishi uchun
  return Buffer.from('﻿' + [header, ...lines].join('\n'), 'utf-8')
}

// ─── XLSX ─────────────────────────────────────────────────────

async function exportToXlsx(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Lidlar')

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }))
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }

  for (const r of rows) sheet.addRow(r)

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}

// ─── PDF ──────────────────────────────────────────────────────

async function exportToPdf(rows: ExportRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(16).text('BilimOn — Lidlar ro\'yxati', { align: 'left' })
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor('#666').text(`Yaratilgan sana: ${new Date().toLocaleString('uz-UZ')} • Jami: ${rows.length} ta lid`)
    doc.moveDown(0.8)
    doc.fillColor('#000')

    // Sodda jadval — PDFKit'da o'rnatilgan jadval qobiliyati yo'q,
    // shu sabab qatorlarni qo'lda ustunlarga bo'lib chizamiz
    const cols: Array<{ key: keyof ExportRow; label: string; w: number }> = [
      { key: 'name', label: 'Ism', w: 90 },
      { key: 'phone', label: 'Telefon', w: 75 },
      { key: 'registrationMethod', label: 'Usul', w: 55 },
      { key: 'city', label: 'Shahar', w: 65 },
      { key: 'goal', label: 'Maqsad', w: 110 },
      { key: 'selectedCenter', label: 'Tanlangan markaz', w: 110 },
      { key: 'status', label: 'Holat', w: 95 },
      { key: 'priority', label: 'Ustuvorlik', w: 55 },
      { key: 'lastActivity', label: 'Oxirgi faollik', w: 100 },
    ]

    const startX = doc.page.margins.left
    let y = doc.y

    function drawHeader() {
      let x = startX
      doc.font('Helvetica-Bold').fontSize(8)
      for (const c of cols) { doc.text(c.label, x, y, { width: c.w }); x += c.w }
      y += 16
      doc.moveTo(startX, y - 3).lineTo(doc.page.width - doc.page.margins.right, y - 3).strokeColor('#ccc').stroke()
      doc.font('Helvetica').fontSize(8)
    }

    drawHeader()
    for (const r of rows) {
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage()
        y = doc.page.margins.top
        drawHeader()
      }
      let x = startX
      for (const c of cols) { doc.text(String(r[c.key]), x, y, { width: c.w, ellipsis: true }); x += c.w }
      y += 16
    }

    doc.end()
  })
}

// ─── DOCX ─────────────────────────────────────────────────────

async function exportToDocx(rows: ExportRow[]): Promise<Buffer> {
  const headerRow = new TableRow({
    children: COLUMNS.map((c) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: c.header, bold: true })] })],
    })),
  })

  const dataRows = rows.map((r) => new TableRow({
    children: COLUMNS.map((c) => new TableCell({
      children: [new Paragraph(String(r[c.key]))],
    })),
  }))

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "BilimOn — Lidlar ro'yxati", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Yaratilgan sana: ${new Date().toLocaleString('uz-UZ')} • Jami: ${rows.length} ta lid` }),
        new Paragraph({ text: '' }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
      ],
    }],
  })

  return Packer.toBuffer(doc)
}

// ─── Dispatcher ───────────────────────────────────────────────

export async function exportLeads(
  leads: LeadListItem[],
  format: ExportFormat,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const rows = leads.map(toRow)
  const stamp = new Date().toISOString().slice(0, 10)

  switch (format) {
    case 'csv':
      return { buffer: exportToCsv(rows), filename: `bilimon-leads-${stamp}.csv`, contentType: 'text/csv; charset=utf-8' }
    case 'xlsx':
      return { buffer: await exportToXlsx(rows), filename: `bilimon-leads-${stamp}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    case 'pdf':
      return { buffer: await exportToPdf(rows), filename: `bilimon-leads-${stamp}.pdf`, contentType: 'application/pdf' }
    case 'docx':
      return { buffer: await exportToDocx(rows), filename: `bilimon-leads-${stamp}.docx`, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  }
}
