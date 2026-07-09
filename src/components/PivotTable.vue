<template>
  <div class="pivot-output" v-if="result && !result.isEmpty">
    <!-- Controls -->
    <div class="pivot-output__toolbar">
      <div class="pivot-output__info">
        <span class="pivot-output__info-badge">
          {{ result.rowKeys.length }} righe &times; {{ result.colKeys.length }} colonne
        </span>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" @click="copyAsTSV">
        Copia come TSV
      </button>
    </div>

    <!-- Table wrapper for horizontal scroll -->
    <div class="pivot-output__table-wrap" ref="tableWrapRef">
      <table class="pivot-table" role="table">
        <thead>
          <!-- Column header groups (nested column fields) -->
          <tr v-for="(level, li) in colFieldDepth" :key="'hdr-level-' + li">
            <!-- Row header spacer cells -->
            <th
              v-for="(rf, ri) in result.rowFields"
              :key="'rh-' + ri"
              class="pivot-table__rh-empty"
              :colspan="ri === result.rowFields.length - 1 && li === colFieldDepth - 1 ? 0 : 1"
              :rowspan="ri === result.rowFields.length - 1 && li === colFieldDepth - 1 ? colFieldDepth - li : 1"
            ></th>

            <!-- Value field spacer (for multiple value fields) -->
            <th
              v-if="li === 0 && result.valueFields.length > 1"
              class="pivot-table__rh-empty"
              :rowspan="colFieldDepth"
            ></th>

            <!-- Column headers at this level -->
            <th
              v-for="(colGroup, cgi) in colGroupSpans"
              :key="'ch-' + cgi"
              class="pivot-table__ch"
              :colspan="colGroup.span"
              :scope="'col'"
            >
              {{ colLevelValues[li][cgi] }}
            </th>

            <!-- Total column header -->
            <th
              v-if="result.colKeys.length > 0"
              class="pivot-table__ch pivot-table__ch--total"
              :rowspan="colFieldDepth"
              scope="col"
            >
              Totale
            </th>
          </tr>

          <!-- Value field sub-headers (when multiple value fields) -->
          <tr v-if="result.valueFields.length > 1">
            <th
              v-for="rf in result.rowFields"
              :key="'rh-vf-' + rf"
              class="pivot-table__rh-empty"
              :rowspan="1"
            ></th>
            <th
              v-for="ck in result.colKeys"
              :key="'vf-' + ck.join('|')"
              class="pivot-table__ch pivot-table__ch--sub"
              :colspan="result.valueFields.length"
              scope="col"
            >
              {{ ck.length ? ck.join(' › ') : '—' }}
            </th>
            <th
              v-if="result.colKeys.length > 0"
              class="pivot-table__ch pivot-table__ch--total"
              :colspan="result.valueFields.length"
              scope="col"
            >
              Totale
            </th>
          </tr>

          <!-- Value field names row (when multiple) -->
          <tr v-if="result.valueFields.length > 1">
            <th
              v-for="rf in result.rowFields"
              :key="'rh-vfn-' + rf"
              class="pivot-table__rh-empty"
            ></th>
            <template v-for="ck in result.colKeys" :key="'vfn-' + ck.join('|')">
              <th
                v-for="vf in result.valueFields"
                :key="'vfn-' + ck.join('|') + '-' + vf.field"
                class="pivot-table__ch pivot-table__ch--val"
                scope="col"
              >
                {{ vf.field }}<br /><span class="pivot-table__agg-label">{{ aggLabel(vf.agg) }}</span>
              </th>
            </template>
            <template v-if="result.colKeys.length > 0">
              <th
                v-for="vf in result.valueFields"
                :key="'vfn-total-' + vf.field"
                class="pivot-table__ch pivot-table__ch--val pivot-table__ch--total"
                scope="col"
              >
                {{ vf.field }}<br /><span class="pivot-table__agg-label">{{ aggLabel(vf.agg) }}</span>
              </th>
            </template>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(rk, ri) in result.rowKeys"
            :key="'row-' + ri"
            :class="{ 'pivot-table__row--total': ri === result.rowKeys.length - 1 }"
          >
            <!-- Row header cells (merged for first field) -->
            <template v-for="(rf, rfi) in result.rowFields" :key="'rc-' + rfi">
              <th
                v-if="rfi === 0 && result.rowSpans[ri] > 0"
                class="pivot-table__rh"
                :rowspan="result.rowSpans[ri]"
                scope="row"
              >
                {{ rk[rfi] || '—' }}
              </th>
              <th
                v-else-if="rfi === 0 && result.rowSpans[ri] === 0"
                class="pivot-table__rh pivot-table__rh--hidden"
                aria-hidden="true"
              ></th>
              <th
                v-else
                class="pivot-table__rh"
                scope="row"
              >
                {{ rk[rfi] || '—' }}
              </th>
            </template>

            <!-- Data cells -->
            <template v-for="(colVal, ci) in result.colKeys" :key="'cell-' + ci">
              <td
                v-for="(vf, vi) in result.valueFields"
                :key="'cellv-' + vi + '-' + ci"
                class="pivot-table__cell"
                :class="{
                  'pivot-table__cell--total-col': ci === result.colKeys.length - 1,
                  'pivot-table__cell--highlight': isHighlightCell(ri, ci)
                }"
              >
                {{ formatVal(result.data[vi][ri][ci]) }}
              </td>
            </template>

            <!-- Row total cells -->
            <template v-if="result.colKeys.length > 0">
              <td
                v-for="(vf, vi) in result.valueFields"
                :key="'total-' + vi + '-' + ri"
                class="pivot-table__cell pivot-table__cell--total"
              >
                {{ formatVal(result.data[vi][ri][result.colKeys.length]) }}
              </td>
            </template>
          </tr>

          <!-- Grand total row -->
          <tr class="pivot-table__row--grand-total" v-if="result.rowKeys.length > 1">
            <th
              :colspan="result.rowFields.length"
              class="pivot-table__rh pivot-table__rh--total"
            >
              Totale
            </th>
            <template v-for="(colVal, ci) in result.colKeys" :key="'gtc-' + ci">
              <td
                v-for="(vf, vi) in result.valueFields"
                :key="'gtcv-' + vi + '-' + ci"
                class="pivot-table__cell pivot-table__cell--grand"
              >
                {{ formatVal(result.data[vi][result.rowKeys.length][ci]) }}
              </td>
            </template>
            <template v-if="result.colKeys.length > 0">
              <td
                v-for="(vf, vi) in result.valueFields"
                :key="'gtt-' + vi"
                class="pivot-table__cell pivot-table__cell--grand pivot-table__cell--total"
              >
                {{ formatVal(result.data[vi][result.rowKeys.length][result.colKeys.length]) }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber } from '../engine/pivotEngine.js'

const props = defineProps({
  result: { type: Object, required: true },
  rows: { type: Array, default: () => [] }
})

// Depth of column headers
const colFieldDepth = computed(() => Math.max(1, props.result.colFields.length))

// Column group spans for the header levels
const colGroupSpans = computed(() => {
  if (props.result.colKeys.length === 0 || props.result.colFields.length === 0) return []
  // For simplicity with single value field, each colKey has span 1
  // With multiple value fields, span = valueFields.length
  const span = Math.max(1, props.result.valueFields.length)
  return props.result.colKeys.map(() => ({ span }))
})

// Column level values for header rendering
const colLevelValues = computed(() => {
  const depth = colFieldDepth.value
  const keys = props.result.colKeys
  const levels = []

  for (let level = 0; level < depth; level++) {
    const vals = []
    let i = 0
    while (i < keys.length) {
      const val = keys[i][level] || ''
      let span = 1
      while (i + span < keys.length && (keys[i + span][level] || '') === val) {
        span++
      }
      // Check if grouping is consistent across ALL deeper levels
      // For simplicity, we just record the first span
      vals.push(val)
      i += span
    }
    levels.push(vals)
  }

  return levels
})

function aggLabel(agg) {
  switch (agg) {
    case 'sum': return 'somma'
    case 'count': return 'conteggio'
    case 'avg': return 'media'
    default: return agg
  }
}

function formatVal(val) {
  return formatNumber(val)
}

function isHighlightCell(rowIdx, colIdx) {
  // Highlight cells that are non-zero and relatively high
  return false // subtle by default, could be enhanced
}

function copyAsTSV() {
  const result = props.result
  if (!result || result.isEmpty) return

  const lines = []

  // Header row
  const headerCells = [...result.rowFields]
  for (const ck of result.colKeys) {
    for (const vf of result.valueFields) {
      headerCells.push(`${ck.join(' › ')} ${vf.field} (${aggLabel(vf.agg)})`)
    }
  }
  if (result.colKeys.length > 0) {
    for (const vf of result.valueFields) {
      headerCells.push(`Totale ${vf.field}`)
    }
  }
  lines.push(headerCells.join('\t'))

  // Data rows
  for (let ri = 0; ri < result.rowKeys.length; ri++) {
    const cells = []
    for (let rfi = 0; rfi < result.rowFields.length; rfi++) {
      cells.push(result.rowKeys[ri][rfi] || '')
    }
    for (let ci = 0; ci < result.colKeys.length; ci++) {
      for (let vi = 0; vi < result.valueFields.length; vi++) {
        cells.push(formatVal(result.data[vi][ri][ci]))
      }
    }
    if (result.colKeys.length > 0) {
      for (let vi = 0; vi < result.valueFields.length; vi++) {
        cells.push(formatVal(result.data[vi][ri][result.colKeys.length]))
      }
    }
    lines.push(cells.join('\t'))
  }

  // Total row
  if (result.rowKeys.length > 1) {
    const cells = ['Totale']
    for (let rfi = 1; rfi < result.rowFields.length; rfi++) {
      cells.push('')
    }
    for (let ci = 0; ci < result.colKeys.length; ci++) {
      for (let vi = 0; vi < result.valueFields.length; vi++) {
        cells.push(formatVal(result.data[vi][result.rowKeys.length][ci]))
      }
    }
    if (result.colKeys.length > 0) {
      for (let vi = 0; vi < result.valueFields.length; vi++) {
        cells.push(formatVal(result.data[vi][result.rowKeys.length][result.colKeys.length]))
      }
    }
    lines.push(cells.join('\t'))
  }

  const tsv = lines.join('\n')
  navigator.clipboard.writeText(tsv).catch(() => {
    // Fallback: select and copy from a temporary textarea
    const ta = document.createElement('textarea')
    ta.value = tsv
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
}
</script>

<style scoped>
/* ---- Pivot Output ---- */
.pivot-output {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pivot-output__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pivot-output__info {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.pivot-output__info-badge {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 2px 10px;
  font-size: var(--text-xs);
  font-weight: 500;
}

.pivot-output__table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

/* ---- Pivot Table ---- */
.pivot-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  font-family: var(--font-body);
  line-height: 1.5;
  white-space: nowrap;
}

/* Header cells */
.pivot-table th {
  font-weight: 500;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--color-border);
  background: var(--color-surface-alt);
  color: var(--color-text);
  position: sticky;
  top: 0;
  z-index: 1;
}

.pivot-table thead th {
  top: 0;
  z-index: 2;
}

.pivot-table__rh-empty {
  background: var(--color-surface-alt);
  border-right: 1px solid var(--color-border);
  min-width: 40px;
}

.pivot-table__ch {
  text-align: center;
  font-weight: 500;
  min-width: 80px;
  border-right: 1px solid var(--color-border);
}

.pivot-table__ch--total {
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-left: 2px solid var(--color-primary);
}

.pivot-table__ch--sub {
  font-size: var(--text-xs);
  text-align: center;
  background: var(--color-surface-hover);
}

.pivot-table__ch--val {
  font-size: var(--text-2xs);
  text-align: center;
  background: var(--color-surface-alt);
}

.pivot-table__agg-label {
  font-weight: 400;
  color: var(--color-text-muted);
  text-transform: lowercase;
}

/* Row header cells */
.pivot-table__rh {
  font-weight: 500;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface-alt);
  color: var(--color-text);
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 100px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pivot-table__rh--hidden {
  display: none;
}

.pivot-table__rh--total {
  font-weight: 600;
  color: var(--color-primary);
  border-top: 2px solid var(--color-primary);
}

/* Data cells */
.pivot-table__cell {
  text-align: right;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  min-width: 80px;
}

.pivot-table__cell--total {
  font-weight: 600;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-left: 2px solid var(--color-primary);
}

.pivot-table__cell--total-col {
  font-weight: 500;
}

.pivot-table__cell--grand {
  font-weight: 600;
  background: var(--color-surface-alt);
  border-top: 2px solid var(--color-primary);
}

/* Row zebra */
.pivot-table tbody tr:nth-child(even) .pivot-table__cell {
  background: rgba(0,0,0,0.015);
}

.pivot-table tbody tr:nth-child(even) .pivot-table__cell--total {
  background: var(--color-primary-light);
}

/* Grand total row */
.pivot-table__row--grand-total .pivot-table__cell,
.pivot-table__row--grand-total .pivot-table__rh {
  border-top: 2px solid var(--color-text);
  font-weight: 600;
}

/* Buttons (reuse) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  font-family: var(--font-body);
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  min-height: 36px;
  min-width: 44px;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  line-height: 1.4;
}

.btn--ghost {
  background: transparent;
  color: var(--color-primary);
  border-color: var(--color-border);
}

.btn--ghost:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.btn--sm {
  padding: var(--space-1) var(--space-3);
  min-height: 36px;
  font-size: var(--text-sm);
}

/* Responsive */
@media (max-width: 700px) {
  .pivot-table {
    font-size: var(--text-xs);
  }

  .pivot-table th,
  .pivot-table__cell,
  .pivot-table__rh {
    padding: var(--space-1) var(--space-2);
  }

  .pivot-table__cell {
    min-width: 60px;
  }
}
</style>
