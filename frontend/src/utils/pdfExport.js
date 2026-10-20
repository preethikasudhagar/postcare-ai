import { jsPDF } from 'jspdf'

/**
 * Generates and downloads a clean, professional clinical PDF report.
 *
 * @param {Object} options
 * @param {string} options.title - Report title
 * @param {string} options.subtitle - Description or clinical context
 * @param {Array<{label: string, value: string|number, note?: string}>} options.metrics - Key statistics
 * @param {Array<string>} options.tableHeaders - Column header titles
 * @param {Array<Array<string|number>>} options.tableRows - 2D matrix of row cells
 * @param {string} [options.filename] - Target PDF filename without extension
 */
export function exportReportToPDF({
  title = 'PostCare AI Clinical Report',
  subtitle = 'Clinical Analytics & Cohort Monitoring',
  metrics = [],
  tableHeaders = [],
  tableRows = [],
  filename = 'postcare-clinical-report'
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 36
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Primary Brand Colors
  const primaryColor = [29, 95, 209] // #1D5FD1
  const darkText = [15, 27, 45]     // #0F1B2D
  const mutedText = [100, 116, 139] // #64748B
  const lightBg = [241, 245, 249]   // #F1F5F9
  const borderLight = [226, 232, 240]

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(margin, y, contentWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('POSTCARE AI  |  CLINICAL RECOVERY MANAGEMENT', margin + 14, y + 25)

  y += 54

  // Title & Metadata
  doc.setTextColor(...darkText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, margin, y)

  y += 16
  doc.setTextColor(...mutedText)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
  doc.text(`Generated: ${dateStr}   |   ${subtitle}`, margin, y)

  y += 20

  // Metrics Section (Key Performance Indicators)
  if (metrics && metrics.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...darkText)
    doc.text('KEY CLINICAL METRICS', margin, y)
    y += 10

    const colWidth = (contentWidth - (metrics.length - 1) * 8) / Math.min(metrics.length, 4)
    const cardHeight = 44

    metrics.slice(0, 4).forEach((m, idx) => {
      const x = margin + idx * (colWidth + 8)

      // Card Background
      doc.setFillColor(...lightBg)
      doc.setDrawColor(...borderLight)
      doc.roundedRect(x, y, colWidth, cardHeight, 4, 4, 'FD')

      // Label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...mutedText)
      doc.text(String(m.label).toUpperCase(), x + 8, y + 14)

      // Value
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...primaryColor)
      doc.text(String(m.value || 'N/A'), x + 8, y + 30)

      if (m.note) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...mutedText)
        doc.text(String(m.note), x + 8, y + 39)
      }
    })

    y += cardHeight + 20
  }

  // Detailed Data Table Section
  if (tableHeaders.length > 0 && tableRows.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...darkText)
    doc.text('DETAILED AUDIT LOG & RECORDS', margin, y)
    y += 12

    const numCols = tableHeaders.length
    const colW = contentWidth / numCols
    const rowH = 20

    // Header Row
    doc.setFillColor(...lightBg)
    doc.rect(margin, y, contentWidth, rowH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...darkText)

    tableHeaders.forEach((h, i) => {
      doc.text(String(h), margin + i * colW + 6, y + 13)
    })
    y += rowH

    // Table Data Rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)

    tableRows.forEach((row, rIdx) => {
      // Check page break
      if (y + rowH > pageHeight - margin - 30) {
        // Add footer to current page
        renderFooter(doc, pageWidth, pageHeight, margin, mutedText)
        doc.addPage()
        y = margin + 20

        // Reprint table header on new page
        doc.setFillColor(...lightBg)
        doc.rect(margin, y, contentWidth, rowH, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...darkText)
        tableHeaders.forEach((h, i) => {
          doc.text(String(h), margin + i * colW + 6, y + 13)
        })
        y += rowH
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
      }

      // Alternating row background
      if (rIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y, contentWidth, rowH, 'F')
      }

      // Border bottom
      doc.setDrawColor(...borderLight)
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH)

      doc.setTextColor(...darkText)
      row.forEach((cell, cIdx) => {
        const textVal = cell !== null && cell !== undefined ? String(cell) : '—'
        // Truncate text if it would overflow column width
        const maxLen = Math.floor(colW / 4.8)
        const displayVal = textVal.length > maxLen ? textVal.substring(0, maxLen - 2) + '…' : textVal
        doc.text(displayVal, margin + cIdx * colW + 6, y + 13)
      })

      y += rowH
    })
  } else if (tableHeaders.length > 0 && tableRows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...mutedText)
    doc.text('No active records recorded in the database.', margin, y + 15)
    y += 30
  }

  // Render footer on the last page
  renderFooter(doc, pageWidth, pageHeight, margin, mutedText)

  // Download PDF
  const safeFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  doc.save(`${safeFilename}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

function renderFooter(doc, pageWidth, pageHeight, margin, mutedText) {
  const footerY = pageHeight - margin + 14
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY - 14, pageWidth - margin, footerY - 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...mutedText)
  doc.text(
    'CONFIDENTIAL CLINICAL DOCUMENT — FOR AUTHORIZED HEALTHCARE PROFESSIONAL USE ONLY',
    margin,
    footerY
  )

  const pageInfo = `Page ${doc.internal.getNumberOfPages()}`
  doc.text(pageInfo, pageWidth - margin - doc.getTextWidth(pageInfo), footerY)
}
