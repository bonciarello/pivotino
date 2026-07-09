<template>
  <div class="data-input">
    <div class="data-input__header">
      <label for="data-textarea" class="data-input__label">
        Incolla qui i dati (da Excel, Google Sheets o CSV)
      </label>
      <div class="data-input__actions">
        <button
          v-if="!hasData"
          type="button"
          class="btn btn--ghost btn--sm"
          @click="loadSample"
        >
          Carica esempio
        </button>
        <button
          v-if="hasData"
          type="button"
          class="btn btn--ghost btn--sm"
          @click="clearData"
        >
          Cancella
        </button>
      </div>
    </div>

    <textarea
      id="data-textarea"
      ref="textareaRef"
      v-model="rawText"
      class="data-input__textarea"
      :placeholder="placeholder"
      rows="8"
      spellcheck="false"
      @input="onInput"
      @blur="onBlur"
    ></textarea>

    <!-- Parse status -->
    <div v-if="parseError" class="data-input__error" role="alert">
      <span class="data-input__error-icon" aria-hidden="true">⚠</span>
      {{ parseError }}
    </div>

    <div v-if="parseSuccess" class="data-input__success">
      <span class="data-input__success-icon" aria-hidden="true">✓</span>
      Rilevate <strong>{{ columnCount }}</strong> colonne e <strong>{{ rowCount }}</strong> righe.
      Delimitatore: <code>{{ detectedDelimiter }}</code>
    </div>

    <!-- Mini preview table -->
    <div v-if="parseSuccess && previewRows.length > 0" class="data-input__preview">
      <table class="mini-table" aria-label="Anteprima dati">
        <thead>
          <tr>
            <th v-for="col in previewColumns" :key="col">{{ col }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in previewRows" :key="ri">
            <td v-for="col in previewColumns" :key="col">{{ row[col] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { parseData } from '../engine/parser.js'

const props = defineProps({
  initialText: { type: String, default: '' }
})

const emit = defineEmits(['data-parsed'])

const rawText = ref('')
const textareaRef = ref(null)
const parseError = ref(null)

const parsedResult = ref({ columns: [], rows: [], delimiter: ',' })

// Auto-parse on mount if initial text is provided
const hasLoadedSample = ref(false)

// Parse function
function doParse() {
  const result = parseData(rawText.value)
  parsedResult.value = result
  parseError.value = result.error

  if (!result.error && result.columns.length > 0) {
    emit('data-parsed', { columns: result.columns, rows: result.rows })
  }
}

// Debounced parse on input
let parseTimeout = null
function onInput() {
  clearTimeout(parseTimeout)
  parseTimeout = setTimeout(doParse, 300)
}

function onBlur() {
  clearTimeout(parseTimeout)
  doParse()
}

const hasData = computed(() => rawText.value.trim().length > 0)

const parseSuccess = computed(() =>
  !parseError.value && parsedResult.value.columns.length > 0 && parsedResult.value.rows.length > 0
)

const columnCount = computed(() => parsedResult.value.columns.length)
const rowCount = computed(() => parsedResult.value.rows.length)
const detectedDelimiter = computed(() =>
  parsedResult.value.delimiter === '\t' ? 'TAB' : 'virgola'
)

const previewColumns = computed(() => parsedResult.value.columns)
const previewRows = computed(() => parsedResult.value.rows.slice(0, 5))

const placeholder = `Incolla qui i tuoi dati…

Esempio (TAB o virgola):
Prodotto\tRegione\tVendite
Widget A\tNord\t1200
Widget B\tSud\t800`

function loadSample() {
  rawText.value = props.initialText
  hasLoadedSample.value = true
  doParse()
  // Focus the textarea after loading
  if (textareaRef.value) textareaRef.value.focus()
}

function clearData() {
  rawText.value = ''
  hasLoadedSample.value = false
  parseError.value = null
  parsedResult.value = { columns: [], rows: [], delimiter: ',' }
}

// Auto-parse initial text
watch(() => props.initialText, (val) => {
  if (val && !hasLoadedSample.value) {
    loadSample()
  }
}, { immediate: true })
</script>

<style scoped>
.data-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.data-input__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.data-input__label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
}

.data-input__actions {
  display: flex;
  gap: var(--space-2);
}

.data-input__textarea {
  width: 100%;
  min-height: 160px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  resize: vertical;
  transition: border-color var(--transition-fast);
}

.data-input__textarea:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.data-input__textarea::placeholder {
  color: var(--color-text-subtle);
  font-family: var(--font-body);
}

/* Status messages */
.data-input__error,
.data-input__success {
  font-size: var(--text-sm);
  line-height: 1.5;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.data-input__error {
  background: var(--color-error-light);
  color: var(--color-error);
}

.data-input__success {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.data-input__error-icon,
.data-input__success-icon {
  flex-shrink: 0;
  font-weight: 700;
}

/* Preview table */
.data-input__preview {
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.mini-table th {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  font-weight: 500;
  text-align: left;
  padding: var(--space-1) var(--space-2);
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
  position: sticky;
  top: 0;
}

.mini-table td {
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-table tr:last-child td {
  border-bottom: none;
}

/* Buttons */
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
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-2) var(--space-3);
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

@media (max-width: 700px) {
  .data-input__textarea {
    font-size: 16px; /* Prevent iOS zoom */
  }

  .data-input__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
