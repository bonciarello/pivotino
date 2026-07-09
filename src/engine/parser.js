/**
 * Parser TSV/CSV — auto-detects delimiter and parses tabular data.
 * Returns { columns: string[], rows: Record<string, string>[] }
 */

/**
 * Detect delimiter: tab if any line contains a tab, otherwise comma.
 * Falls back to comma if no delimiter found.
 */
export function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0] || ''
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(',')) return ','
  return ','
}

/**
 * Parse a single line respecting quoted fields.
 */
function parseLine(line, delimiter) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

/**
 * Parse tabular text into structured data.
 * Returns { columns, rows, delimiter, error }.
 */
export function parseData(text) {
  if (!text || !text.trim()) {
    return { columns: [], rows: [], delimiter: ',', error: 'Inserisci dei dati per iniziare.' }
  }

  const delimiter = detectDelimiter(text)
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '')

  if (lines.length < 2) {
    return {
      columns: [],
      rows: [],
      delimiter,
      error: 'Servono almeno due righe: una di intestazione e una di dati.'
    }
  }

  const headerFields = parseLine(lines[0], delimiter)
  if (headerFields.length === 0) {
    return { columns: [], rows: [], delimiter, error: 'Intestazioni non valide.' }
  }

  // Clean header names (remove BOM, extra whitespace, ensure unique)
  const seen = new Map()
  const columns = headerFields.map((h, i) => {
    let name = h.replace(/^\uFEFF/, '').trim()
    if (!name) name = `Colonna ${i + 1}`
    // Ensure uniqueness
    if (seen.has(name)) {
      const count = seen.get(name) + 1
      seen.set(name, count)
      name = `${name}_${count}`
    } else {
      seen.set(name, 0)
    }
    return name
  })

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i], delimiter)
    const row = {}
    for (let j = 0; j < columns.length; j++) {
      row[columns[j]] = j < fields.length ? fields[j] : ''
    }
    rows.push(row)
  }

  return { columns, rows, delimiter, error: null }
}

export default { detectDelimiter, parseData }
