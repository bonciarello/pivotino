import { describe, it, expect } from 'vitest'
import { computePivot, formatNumber } from '../src/engine/pivotEngine.js'

const sampleRows = [
  { Product: 'Widget A', Region: 'North', Sales: '100', Qty: '10' },
  { Product: 'Widget A', Region: 'South', Sales: '200', Qty: '20' },
  { Product: 'Widget B', Region: 'North', Sales: '300', Qty: '30' },
  { Product: 'Widget B', Region: 'South', Sales: '400', Qty: '40' },
  { Product: 'Widget A', Region: 'North', Sales: '150', Qty: '15' },
]

describe('computePivot', () => {
  it('computes basic pivot with one row field, one col field, one value', () => {
    const result = computePivot(sampleRows, ['Product'], ['Region'], [
      { field: 'Sales', agg: 'sum' }
    ])

    expect(result.isEmpty).toBe(false)
    expect(result.rowFields).toEqual(['Product'])
    expect(result.colFields).toEqual(['Region'])

    // Row keys: Widget A, Widget B
    expect(result.rowKeys).toEqual([['Widget A'], ['Widget B']])
    // Col keys: North, South
    expect(result.colKeys).toEqual([['North'], ['South']])

    // Data: Widget A North = 100+150=250, Widget A South = 200
    // Widget B North = 300, Widget B South = 400
    const grid = result.data[0]
    expect(grid[0][0]).toBe(250) // A, North
    expect(grid[0][1]).toBe(200) // A, South
    expect(grid[1][0]).toBe(300) // B, North
    expect(grid[1][1]).toBe(400) // B, South
  })

  it('computes totals correctly', () => {
    const result = computePivot(sampleRows, ['Product'], ['Region'], [
      { field: 'Sales', agg: 'sum' }
    ])

    const grid = result.data[0]
    // Row totals (index 2, since there are 2 cols)
    expect(grid[0][2]).toBe(450) // A total: 250 + 200
    expect(grid[1][2]).toBe(700) // B total: 300 + 400
    // Column totals (row index 2, since there are 2 rows)
    expect(grid[2][0]).toBe(550) // North total: 250 + 300
    expect(grid[2][1]).toBe(600) // South total: 200 + 400
    // Grand total
    expect(grid[2][2]).toBe(1150)
  })

  it('computes count aggregation', () => {
    const result = computePivot(sampleRows, ['Product'], ['Region'], [
      { field: 'Sales', agg: 'count' }
    ])

    const grid = result.data[0]
    // Widget A North: 2 records, Widget A South: 1, Widget B North: 1, Widget B South: 1
    expect(grid[0][0]).toBe(2)
    expect(grid[0][1]).toBe(1)
    expect(grid[1][0]).toBe(1)
    expect(grid[1][1]).toBe(1)
  })

  it('computes average aggregation', () => {
    const result = computePivot(sampleRows, ['Product'], ['Region'], [
      { field: 'Sales', agg: 'avg' }
    ])

    const grid = result.data[0]
    // Widget A North: (100+150)/2 = 125
    expect(grid[0][0]).toBe(125)
  })

  it('handles empty rows', () => {
    const result = computePivot([], ['Product'], ['Region'], [
      { field: 'Sales', agg: 'sum' }
    ])
    expect(result.isEmpty).toBe(true)
  })

  it('handles no value fields', () => {
    const result = computePivot(sampleRows, ['Product'], ['Region'], [])
    expect(result.isEmpty).toBe(true)
    expect(result.noValues).toBe(true)
  })

  it('handles no row fields', () => {
    const result = computePivot(sampleRows, [], ['Region'], [
      { field: 'Sales', agg: 'sum' }
    ])
    // Should have one row with all data aggregated
    expect(result.rowKeys.length).toBe(1) // single empty group
    const grid = result.data[0]
    expect(grid[0][0]).toBe(550) // North total: 250 + 300
    expect(grid[0][1]).toBe(600) // South total: 200 + 400
  })

  it('handles no column fields', () => {
    const result = computePivot(sampleRows, ['Product'], [], [
      { field: 'Sales', agg: 'sum' }
    ])
    expect(result.colKeys.length).toBe(1) // single empty group
    const grid = result.data[0]
    expect(grid[0][0]).toBe(450) // A total in the single column
    expect(grid[1][0]).toBe(700) // B total
  })

  it('handles multiple row fields', () => {
    const data = [
      { Cat: 'A', Sub: 'X', Val: '10' },
      { Cat: 'A', Sub: 'Y', Val: '20' },
      { Cat: 'B', Sub: 'X', Val: '30' },
    ]
    const result = computePivot(data, ['Cat', 'Sub'], [], [
      { field: 'Val', agg: 'sum' }
    ])
    expect(result.rowKeys).toHaveLength(3)
    expect(result.rowKeys[0]).toEqual(['A', 'X'])
    expect(result.rowKeys[1]).toEqual(['A', 'Y'])
    expect(result.rowKeys[2]).toEqual(['B', 'X'])
    // Row spans: A spans 2 rows
    expect(result.rowSpans[0]).toBe(2)
    expect(result.rowSpans[1]).toBe(0)
    expect(result.rowSpans[2]).toBe(1)
  })

  it('handles multiple value fields', () => {
    const result = computePivot(sampleRows, ['Product'], ['Region'], [
      { field: 'Sales', agg: 'sum' },
      { field: 'Qty', agg: 'sum' }
    ])
    expect(result.data).toHaveLength(2)
    // Sales grid
    expect(result.data[0][0][0]).toBe(250)
    // Qty grid
    expect(result.data[1][0][0]).toBe(25) // 10 + 15
  })

  it('handles non-numeric values gracefully', () => {
    const data = [
      { Name: 'Alice', Val: 'N/A' },
      { Name: 'Bob', Val: '100' },
    ]
    const result = computePivot(data, ['Name'], [], [
      { field: 'Val', agg: 'sum' }
    ])
    // Alice has non-numeric, so sum = 0
    expect(result.data[0][0][0]).toBe(0)
    // Bob has 100
    expect(result.data[0][1][0]).toBe(100)
  })
})

describe('formatNumber', () => {
  it('formats integers', () => {
    expect(formatNumber(1000)).toBe('1.000')
  })

  it('formats decimals', () => {
    expect(formatNumber(1234.56)).toBe('1.234,56')
  })

  it('handles NaN', () => {
    expect(formatNumber(NaN)).toBe('—')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('handles non-number', () => {
    expect(formatNumber('abc')).toBe('—')
  })
})
