<template>
  <div class="app">
    <header class="app-header">
      <div class="app-header__inner">
        <h1 class="app-header__title">Pivotino</h1>
        <p class="app-header__subtitle">Costruisci tabelle pivot dai tuoi dati. Incolla, trascina, analizza.</p>
      </div>
    </header>

    <main class="app-main">
      <!-- Step 1: Data Input -->
      <section class="app-section" aria-labelledby="step1-title">
        <div class="section-eyebrow">Dati</div>
        <h2 id="step1-title" class="section-title">Incolla i tuoi dati</h2>
        <DataInput
          :initial-text="sampleData"
          @data-parsed="onDataParsed"
        />
      </section>

      <!-- Step 2: Column assignment (only when data is parsed) -->
      <section
        v-if="columns.length > 0"
        class="app-section"
        aria-labelledby="step2-title"
      >
        <div class="section-eyebrow">Assegnazione</div>
        <h2 id="step2-title" class="section-title">Trascina le colonne nelle aree</h2>
        <p class="section-desc">
          Trascina i nomi delle colonne nelle tre aree sottostanti per costruire la pivot.
        </p>

        <!-- Available columns pool -->
        <div class="column-pool" role="region" aria-label="Colonne disponibili">
          <span class="column-pool__label">Colonne disponibili:</span>
          <ul class="column-pool__list">
            <li
              v-for="col in availableColumns"
              :key="col"
              :draggable="true"
              class="pill pill--neutral"
              :class="{ 'pill--dragging': dragState.source === col }"
              @dragstart="onDragStart($event, col)"
              @dragend="onDragEnd"
              @click="onPillClick(col)"
            >
              {{ col }}
            </li>
          </ul>
          <p v-if="availableColumns.length === 0" class="column-pool__empty">
            Tutte le colonne sono state assegnate.
            <button type="button" class="link-btn" @click="resetAssignment">Ripristina</button>
          </p>
        </div>

        <!-- Drop zones -->
        <div class="zones">
          <DropZone
            zone-id="rows"
            label="Righe"
            accent="indigo"
            :items="rowFields"
            description="Le colonne qui determinano le intestazioni di riga della pivot."
            @drop-item="addToZone('rows', $event)"
            @remove-item="removeFromZone('rows', $event)"
          />
          <DropZone
            zone-id="cols"
            label="Colonne"
            accent="coral"
            :items="colFields"
            description="Le colonne qui determinano le intestazioni di colonna della pivot."
            @drop-item="addToZone('cols', $event)"
            @remove-item="removeFromZone('cols', $event)"
          />
          <DropZone
            zone-id="values"
            label="Valori"
            accent="amber"
            :items="valueFields"
            :show-agg="true"
            description="La colonna i cui valori vengono aggregati (somma, conteggio o media)."
            @drop-item="addToZone('values', $event)"
            @remove-item="removeFromZone('values', $event)"
            @change-agg="changeAgg"
          />
        </div>
      </section>

      <!-- Step 3: Pivot table output -->
      <section
        v-if="pivotResult && !pivotResult.isEmpty && !pivotResult.noValues"
        class="app-section"
        aria-labelledby="step3-title"
      >
        <div class="section-eyebrow">Risultato</div>
        <h2 id="step3-title" class="section-title">Tabella pivot</h2>
        <PivotTable :result="pivotResult" :rows="parsedRows" />
      </section>

      <!-- Empty / waiting states -->
      <section
        v-else-if="columns.length > 0 && valueFields.length === 0"
        class="app-section app-section--empty"
      >
        <div class="empty-state">
          <p class="empty-state__icon">📋</p>
          <p class="empty-state__text">Trascina almeno una colonna nell'area <strong>Valori</strong> per generare la tabella pivot.</p>
        </div>
      </section>

      <section
        v-else-if="columns.length > 0"
        class="app-section app-section--empty"
      >
        <div class="empty-state">
          <p class="empty-state__icon">📋</p>
          <p class="empty-state__text">Configura le aree Righe, Colonne e Valori per visualizzare la pivot.</p>
        </div>
      </section>
    </main>

    <footer class="app-footer">
      <p>Pivotino &mdash; Analisi dati immediata, senza complicazioni.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DataInput from './components/DataInput.vue'
import DropZone from './components/DropZone.vue'
import PivotTable from './components/PivotTable.vue'
import { computePivot } from './engine/pivotEngine.js'

// ---- Sample data ----
const sampleData = `Prodotto\tRegione\tMese\tVendite\tQuantità
Widget A\tNord\tGennaio\t1200\t45
Widget A\tSud\tGennaio\t800\t30
Widget B\tNord\tGennaio\t2100\t60
Widget B\tSud\tGennaio\t1500\t42
Widget A\tNord\tFebbraio\t1350\t50
Widget A\tSud\tFebbraio\t920\t35
Widget B\tNord\tFebbraio\t2250\t65
Widget B\tSud\tFebbraio\t1680\t48
Widget A\tNord\tMarzo\t1100\t40
Widget A\tSud\tMarzo\t760\t28
Widget B\tNord\tMarzo\t1950\t55
Widget B\tSud\tMarzo\t1420\t40`

// ---- State ----
const columns = ref([])
const parsedRows = ref([])

const rowFields = ref([])
const colFields = ref([])
const valueFields = ref([]) // [{ field: string, agg: 'sum'|'count'|'avg' }]

const dragState = ref({ source: null })

// ---- Computed ----
const availableColumns = computed(() => {
  const used = new Set([
    ...rowFields.value,
    ...colFields.value,
    ...valueFields.value.map(v => v.field)
  ])
  return columns.value.filter(c => !used.has(c))
})

const pivotResult = computed(() => {
  if (parsedRows.value.length === 0) return null
  return computePivot(
    parsedRows.value,
    rowFields.value,
    colFields.value,
    valueFields.value
  )
})

// ---- Methods ----
function onDataParsed({ columns: cols, rows }) {
  columns.value = cols
  parsedRows.value = rows
  // Reset assignments when new data is loaded
  rowFields.value = []
  colFields.value = []
  valueFields.value = []
}

function addToZone(zone, columnName) {
  // Remove from other zones first
  removeFromAllZones(columnName)

  if (zone === 'rows') {
    rowFields.value.push(columnName)
  } else if (zone === 'cols') {
    colFields.value.push(columnName)
  } else if (zone === 'values') {
    valueFields.value.push({ field: columnName, agg: 'sum' })
  }
}

function removeFromZone(zone, item) {
  if (zone === 'rows') {
    rowFields.value = rowFields.value.filter(f => f !== item)
  } else if (zone === 'cols') {
    colFields.value = colFields.value.filter(f => f !== item)
  } else if (zone === 'values') {
    valueFields.value = valueFields.value.filter(v => v.field !== item)
  }
}

function removeFromAllZones(columnName) {
  rowFields.value = rowFields.value.filter(f => f !== columnName)
  colFields.value = colFields.value.filter(f => f !== columnName)
  valueFields.value = valueFields.value.filter(v => v.field !== columnName)
}

function changeAgg(field, agg) {
  const idx = valueFields.value.findIndex(v => v.field === field)
  if (idx !== -1) {
    valueFields.value[idx] = { ...valueFields.value[idx], agg }
  }
}

function resetAssignment() {
  rowFields.value = []
  colFields.value = []
  valueFields.value = []
}

function onDragStart(event, columnName) {
  dragState.value.source = columnName
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', columnName)
}

function onDragEnd() {
  dragState.value.source = null
}

function onPillClick(columnName) {
  // Click on a pill selects it; then clicking a zone adds it
  // If already selected, deselect
  if (dragState.value.source === columnName) {
    dragState.value.source = null
  } else {
    dragState.value.source = columnName
  }
}

// Expose for drop zones to use click-to-add
function addSelectedToZone(zone) {
  if (dragState.value.source && availableColumns.value.includes(dragState.value.source)) {
    addToZone(zone, dragState.value.source)
    dragState.value.source = null
  }
}

// Provide to children via props
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

/* ---- Header ---- */
.app-header {
  background: var(--color-surface-alt);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-4);
}

.app-header__inner {
  max-width: 960px;
  margin: 0 auto;
}

.app-header__title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 400;
  color: var(--color-text);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.app-header__subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
  line-height: 1.5;
}

/* ---- Main ---- */
.app-main {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ---- Sections ---- */
.app-section {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.app-section--empty {
  background: transparent;
  border-color: var(--color-border);
  border-style: dashed;
}

.section-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-primary);
  margin-bottom: var(--space-1);
}

.section-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 400;
  color: var(--color-text);
  line-height: 1.3;
  margin-bottom: var(--space-1);
}

.section-desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
  line-height: 1.5;
}

/* ---- Column Pool ---- */
.column-pool {
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-height: 44px;
}

.column-pool__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.column-pool__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
}

.column-pool__empty {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

/* ---- Pill ---- */
.pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.4;
  cursor: grab;
  user-select: none;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  min-height: 36px;
  border: 1px solid transparent;
}

.pill:active {
  cursor: grabbing;
}

.pill--neutral {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

.pill--neutral:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.pill--dragging {
  opacity: 0.4;
  transform: scale(0.95);
}

/* ---- Drop Zones Grid ---- */
.zones {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

/* ---- Link button ---- */
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  min-height: 44px;
  min-width: 44px;
}

.link-btn:hover {
  color: var(--color-primary-hover);
}

/* ---- Empty state ---- */
.empty-state {
  text-align: center;
  padding: var(--space-4) var(--space-2);
}

.empty-state__icon {
  font-size: 2rem;
  margin-bottom: var(--space-2);
}

.empty-state__text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.6;
}

/* ---- Footer ---- */
.app-footer {
  text-align: center;
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-subtle);
  font-size: var(--text-xs);
}

/* ---- Responsive: stack zones on mobile ---- */
@media (max-width: 700px) {
  .zones {
    grid-template-columns: 1fr;
  }

  .app-header {
    padding: var(--space-4) var(--space-3);
  }

  .app-header__title {
    font-size: var(--text-xl);
  }

  .app-main {
    padding: var(--space-3);
    gap: var(--space-3);
  }

  .app-section {
    padding: var(--space-3);
  }

  .column-pool {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
