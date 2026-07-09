import { describe, it, expect } from 'vitest'
import { parseData, detectDelimiter } from '../src/engine/parser.js'

describe('detectDelimiter', () => {
  it('detects tab delimiter', () => {
    const text = 'A\tB\tC\n1\t2\t3'
    expect(detectDelimiter(text)).toBe('\t')
  })

  it('detects comma delimiter', () => {
    const text = 'A,B,C\n1,2,3'
    expect(detectDelimiter(text)).toBe(',')
  })

  it('defaults to comma for empty input', () => {
    expect(detectDelimiter('')).toBe(',')
  })

  it('prefers tab over comma', () => {
    const text = 'A,B\tC\n1,2\t3'
    expect(detectDelimiter(text)).toBe('\t')
  })
})

describe('parseData', () => {
  it('parses TSV data', () => {
    const text = 'Name\tAge\tCity\nAlice\t30\tRome\nBob\t25\tMilan'
    const result = parseData(text)
    expect(result.error).toBeNull()
    expect(result.columns).toEqual(['Name', 'Age', 'City'])
    expect(result.delimiter).toBe('\t')
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ Name: 'Alice', Age: '30', City: 'Rome' })
    expect(result.rows[1]).toEqual({ Name: 'Bob', Age: '25', City: 'Milan' })
  })

  it('parses CSV data', () => {
    const text = 'Name,Age,City\nAlice,30,Rome\nBob,25,Milan'
    const result = parseData(text)
    expect(result.error).toBeNull()
    expect(result.columns).toEqual(['Name', 'Age', 'City'])
    expect(result.delimiter).toBe(',')
    expect(result.rows).toHaveLength(2)
  })

  it('handles quoted fields', () => {
    const text = 'Name,Description\nAlice,"Hello, World"\nBob,"Foo ""Bar"""'
    const result = parseData(text)
    expect(result.rows[0].Description).toBe('Hello, World')
    expect(result.rows[1].Description).toBe('Foo "Bar"')
  })

  it('handles empty input', () => {
    const result = parseData('')
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
    expect(result.error).toBeTruthy()
  })

  it('handles single line input', () => {
    const result = parseData('A,B,C')
    expect(result.error).toBeTruthy()
  })

  it('strips BOM from first column', () => {
    const text = '\uFEFFName\tAge\nAlice\t30'
    const result = parseData(text)
    expect(result.columns[0]).toBe('Name')
  })

  it('handles empty column names', () => {
    const text = 'Name\t\tAge\nAlice\tX\t30'
    const result = parseData(text)
    expect(result.columns[1]).toBe('Colonna 2')
  })

  it('handles duplicate column names', () => {
    const text = 'A,A,A\n1,2,3'
    const result = parseData(text)
    expect(result.columns).toEqual(['A', 'A_1', 'A_2'])
  })

  it('handles missing values in rows', () => {
    const text = 'A,B,C\n1,2'
    const result = parseData(text)
    expect(result.rows[0].C).toBe('')
  })

  it('handles Windows line endings', () => {
    const text = 'A,B\r\n1,2\r\n3,4'
    const result = parseData(text)
    expect(result.rows).toHaveLength(2)
  })

  it('handles empty lines between data', () => {
    const text = 'A,B\n\n1,2\n\n3,4\n'
    const result = parseData(text)
    expect(result.rows).toHaveLength(2)
  })
})
