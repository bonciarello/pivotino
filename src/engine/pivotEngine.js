/**
 * Pivot Engine — computes pivot tables from parsed data.
 *
 * Input:
 *   rows: Record<string, string>[]
 *   rowFields: string[]        — column names for grouping in rows
 *   colFields: string[]        — column names for grouping in columns
 *   valueFields: { field: string, agg: 'sum' | 'count' | 'avg' }[]
 *
 * Output:
 *   {
 *     rowFields, colFields, valueFields,
 *     rowKeys: string[][] — unique row field value combinations
 *     colKeys: string[][] — unique column field value combinations
 *     data: number[][][]   — data[valIdx][rowIdx][colIdx], includes totals
 *     rowSpans: number[]    — for merging cells in first row field
 *   }
 */

const TOTAL_KEY = '__Σ_TOTALE__'

/**
 * Build a string key for a group of field values.
 */
function groupKey(values) {
  return values.join('\x00')
}

/**
 * Parse a float from a string, returning NaN for non-numeric values.
 */
function toNumber(val) {
  if (val === null || val === undefined || val === '') return NaN
  // Handle European number format (1.234,56 → 1234.56)
  const s = String(val).trim()
  // If comma is decimal separator and dot is thousands separator
  if (s.includes(',') && !s.includes('.')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  }
  // Standard format
  return parseFloat(s.replace(/,/g, ''))
}

/**
 * Aggregate values according to the aggregation function.
 */
function aggregate(values, agg) {
  if (values.length === 0) return 0

  const numbers = values.map(toNumber).filter(v => !isNaN(v))

  switch (agg) {
    case 'sum':
      return numbers.reduce((a, b) => a + b, 0)
    case 'count':
      return values.length
    case 'avg':
      if (numbers.length === 0) return 0
      return numbers.reduce((a, b) => a + b, 0) / numbers.length
    default:
      return 0
  }
}

/**
 * Compute the pivot table.
 */
export function computePivot(rows, rowFields, colFields, valueFields) {
  // Edge cases
  if (!rows || rows.length === 0) {
    return {
      rowFields: rowFields || [],
      colFields: colFields || [],
      valueFields: valueFields || [],
      rowKeys: [],
      colKeys: [],
      data: [],
      rowSpans: [],
      isEmpty: true
    }
  }

  if (!valueFields || valueFields.length === 0) {
    return {
      rowFields: rowFields || [],
      colFields: colFields || [],
      valueFields: [],
      rowKeys: [],
      colKeys: [],
      data: [],
      rowSpans: [],
      isEmpty: true,
      noValues: true
    }
  }

  // Build row groups: map of groupKey → array of matching row indices
  const rowGroups = new Map()
  for (let i = 0; i < rows.length; i++) {
    const keyVals = (rowFields || []).map(f => String(rows[i][f] ?? ''))
    const key = groupKey(keyVals)
    if (!rowGroups.has(key)) rowGroups.set(key, { vals: keyVals, indices: [] })
    rowGroups.get(key).indices.push(i)
  }

  // Build column groups: map of groupKey → array of matching row indices
  const colGroups = new Map()
  for (let i = 0; i < rows.length; i++) {
    const keyVals = (colFields || []).map(f => String(rows[i][f] ?? ''))
    const key = groupKey(keyVals)
    if (!colGroups.has(key)) colGroups.set(key, { vals: keyVals, indices: [] })
    colGroups.get(key).indices.push(i)
  }

  // Sort row keys
  const sortedRowKeys = Array.from(rowGroups.keys()).sort()
  const rowKeys = sortedRowKeys.map(k => rowGroups.get(k).vals)
  // If no row fields, use a single empty row key
  const effectiveRowKeys = rowKeys.length > 0 ? rowKeys : [[]]

  // Sort column keys
  const sortedColKeys = Array.from(colGroups.keys()).sort()
  const colKeys = sortedColKeys.map(k => colGroups.get(k).vals)
  // If no column fields, use a single empty column key
  const effectiveColKeys = colKeys.length > 0 ? colKeys : [[]]

  if (effectiveRowKeys.length === 0 && effectiveColKeys.length === 0) {
    effectiveRowKeys.push([])
    effectiveColKeys.push([])
  }

  // Build row-to-indices lookup for cross-product aggregation
  const rowKeyToIndices = new Map()
  for (const [key, entry] of rowGroups) {
    rowKeyToIndices.set(key, entry.indices)
  }
  const colKeyToIndices = new Map()
  for (const [key, entry] of colGroups) {
    colKeyToIndices.set(key, entry.indices)
  }

  // Compute data grid: data[valIdx][rowIdx][colIdx]
  const data = []
  for (const vf of valueFields) {
    const grid = []
    const rowTotals = []
    const colTotals = new Array(effectiveColKeys.length).fill(0)

    for (let ri = 0; ri < effectiveRowKeys.length; ri++) {
      const rk = effectiveRowKeys[ri]
      const rowData = []
      let rowSum = 0

      const rKey = groupKey(rk)
      const rIndices = rowKeyToIndices.get(rKey) || []

      for (let ci = 0; ci < effectiveColKeys.length; ci++) {
        const ck = effectiveColKeys[ci]
        const cKey = groupKey(ck)
        const cIndices = colKeyToIndices.get(cKey) || []

        // Intersection of row and column indices
        const cSet = new Set(cIndices)
        const intersection = rIndices.filter(idx => cSet.has(idx))

        if (intersection.length === 0) {
          rowData.push(0)
          continue
        }

        const values = intersection.map(idx => rows[idx][vf.field])
        const val = aggregate(values, vf.agg)
        rowData.push(val)
        rowSum += val
        colTotals[ci] += val
      }

      // Row total
      rowData.push(rowSum)
      grid.push(rowData)
    }

    // Grand total for column totals row
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0) || colTotals.reduce((a, b) => a + b, 0)

    // Add totals row
    const totalRow = [...colTotals, grandTotal]
    grid.push(totalRow)

    data.push(grid)
  }

  // Compute row spans for the first row field (for cell merging)
  const rowSpans = computeRowSpans(effectiveRowKeys, 0)

  return {
    rowFields: rowFields || [],
    colFields: colFields || [],
    valueFields,
    rowKeys: effectiveRowKeys,
    colKeys: effectiveColKeys,
    data,
    rowSpans,
    isEmpty: false
  }
}

/**
 * Compute row spans for a given field index in row keys.
 * Returns an array where span[i] = number of rows this cell should span.
 */
function computeRowSpans(rowKeys, fieldIndex) {
  const spans = []
  let i = 0
  while (i < rowKeys.length) {
    let span = 1
    const currentVal = rowKeys[i][fieldIndex] ?? ''
    while (i + span < rowKeys.length && (rowKeys[i + span][fieldIndex] ?? '') === currentVal) {
      span++
    }
    spans.push(span)
    for (let s = 1; s < span; s++) {
      spans.push(0) // 0 means this cell should be hidden (merged into above)
    }
    i += span
  }
  return spans
}

/**
 * Format a number for display: up to 2 decimal places, remove trailing zeros.
 */
export function formatNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) return '—'

  // Manual formatting — avoids reliance on ICU locale (Node small ICU lacks it-IT)
  const isNegative = num < 0
  const abs = Math.abs(num)

  let intPart, fracPart

  if (Number.isInteger(abs)) {
    intPart = String(abs)
    fracPart = ''
  } else {
    const rounded = Math.round(abs * 100) / 100
    const parts = rounded.toFixed(2).split('.')
    intPart = parts[0]
    fracPart = parts[1].replace(/0+$/, '') // remove trailing zeros
  }

  // Italian thousands separator: dot
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  let result = isNegative ? '-' + withSep : withSep
  if (fracPart.length > 0) {
    result += ',' + fracPart
  }
  return result
}

export default { computePivot, formatNumber }
