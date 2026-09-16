function csvCell(value) {
  const text = value == null ? '' : String(value).replace(/"/g, '""')
  return `"${text}"`
}

export function downloadAssetCategoryCsv(assets, type) {
  if (!Array.isArray(assets) || assets.length === 0) return false
  const columns = [...new Set(assets.flatMap((asset) => Object.keys(asset)))]
  const csv = [columns, ...assets.map((asset) => columns.map((column) => csvCell(asset[column])))]
    .map((row) =>
      row.map((cell) => (String(cell).startsWith('"') ? cell : csvCell(cell))).join(','),
    )
    .join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Aset_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
