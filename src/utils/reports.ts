function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

export function printPdfReport(title: string, rows: { label: string; value: string }[]): void {
  const content = rows.map(({ label, value }) =>
    `<section><strong>${escapeHtml(label)}</strong><p>${escapeHtml(value).replace(/\n/g, '<br>') || '—'}</p></section>`,
  ).join('')
  const printable = window.open('', '_blank')
  if (!printable) return
  printable.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
    <meta charset="utf-8"><style>
    body{font:14px Arial,sans-serif;color:#222;max-width:900px;margin:40px auto}
    h1{font-size:22px;border-bottom:1px solid #888;padding-bottom:10px}
    section{margin:18px 0;break-inside:avoid}p{white-space:normal;margin:5px 0}
    @media print{body{margin:18mm}button{display:none}}
    </style></head><body><h1>${escapeHtml(title)}</h1>${content}
    <button onclick="window.print()">Print / Save as PDF</button></body></html>`)
  printable.document.close()
  printable.opener = null
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const csv = rows.map((row) => row.map((item) => {
    let value = String(item ?? '')
    if (/^[=+\-@]/.test(value)) value = `'${value}`
    return `"${value.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
