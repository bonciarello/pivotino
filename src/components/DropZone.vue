<template>
  <div
    class="dropzone"
    :class="[
      `dropzone--${accent}`,
      { 'dropzone--over': isOver, 'dropzone--active': isActive }
    ]"
    @dragover.prevent="onDragOver"
    @dragenter.prevent="onDragEnter"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @click="onZoneClick"
    role="region"
    :aria-label="`Area ${label}`"
    :aria-description="description"
  >
    <div class="dropzone__header">
      <span class="dropzone__accent-dot" aria-hidden="true"></span>
      <span class="dropzone__label">{{ label }}</span>
      <span class="dropzone__count" v-if="items.length > 0">{{ items.length }}</span>
    </div>

    <p class="dropzone__desc">{{ description }}</p>

    <ul v-if="items.length > 0" class="dropzone__items" :aria-label="`${label} assegnate`">
      <li
        v-for="(item, idx) in items"
        :key="typeof item === 'string' ? item : item.field + idx"
        class="pill"
        :class="[`pill--${accent}`]"
      >
        <span class="pill__label">{{ typeof item === 'string' ? item : item.field }}</span>

        <!-- Aggregation selector for values zone -->
        <select
          v-if="showAgg && typeof item !== 'string'"
          class="pill__agg"
          :value="item.agg"
          :aria-label="`Aggregazione per ${item.field}`"
          @change="onAggChange(item.field, ($event.target).value)"
          @click.stop
        >
          <option value="sum">Somma</option>
          <option value="count">Conteggio</option>
          <option value="avg">Media</option>
        </select>

        <button
          type="button"
          class="pill__remove"
          :aria-label="`Rimuovi ${typeof item === 'string' ? item : item.field} da ${label}`"
          @click.stop="removeItem(typeof item === 'string' ? item : item.field)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </li>
    </ul>

    <div v-else class="dropzone__placeholder">
      <span class="dropzone__placeholder-icon" aria-hidden="true">+</span>
      Trascina qui una colonna
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  zoneId: { type: String, required: true },
  label: { type: String, required: true },
  accent: { type: String, default: 'indigo' },
  items: { type: Array, default: () => [] },
  description: { type: String, default: '' },
  showAgg: { type: Boolean, default: false }
})

const emit = defineEmits(['drop-item', 'remove-item', 'change-agg'])

const isOver = ref(false)
const isActive = ref(false)

function onDragOver(event) {
  event.dataTransfer.dropEffect = 'move'
}

function onDragEnter() {
  isOver.value = true
}

function onDragLeave(event) {
  // Only set to false if we're actually leaving the zone, not entering a child
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isOver.value = false
  }
}

function onDrop(event) {
  isOver.value = false
  isActive.value = true
  setTimeout(() => { isActive.value = false }, 400)

  const columnName = event.dataTransfer.getData('text/plain')
  if (columnName) {
    emit('drop-item', columnName)
  }
}

function onZoneClick() {
  // If a column is "click-selected" in the pool, add it here
  // This is handled by the parent via event delegation, but we emit a
  // generic "click on zone" that parent can use
  // Actually, since we're using props/events, the parent handles click-to-add
  // via its own logic. We just emit the drop-item when something drops.
  // For click-to-add, the parent can also dispatch add on pill click.
}

function removeItem(item) {
  emit('remove-item', item)
}

function onAggChange(field, agg) {
  emit('change-agg', field, agg)
}
</script>

<style scoped>
/* ---- Drop Zone ---- */
.dropzone {
  background: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 120px;
}

.dropzone--indigo {
  --zone-accent: var(--color-indigo);
  --zone-accent-light: var(--color-indigo-light);
}

.dropzone--coral {
  --zone-accent: var(--color-coral);
  --zone-accent-light: var(--color-coral-light);
}

.dropzone--amber {
  --zone-accent: var(--color-amber);
  --zone-accent-light: var(--color-amber-light);
}

.dropzone--over {
  border-color: var(--zone-accent);
  background: var(--zone-accent-light);
  box-shadow: 0 0 0 4px var(--zone-accent-light);
}

.dropzone--active {
  border-color: var(--zone-accent);
  box-shadow: 0 0 0 4px var(--zone-accent-light);
}

/* ---- Header ---- */
.dropzone__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.dropzone__accent-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--zone-accent);
  flex-shrink: 0;
}

.dropzone__label {
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: 400;
  color: var(--color-text);
  line-height: 1.3;
}

.dropzone__count {
  background: var(--zone-accent-light);
  color: var(--zone-accent);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  min-width: 20px;
  text-align: center;
}

.dropzone__desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* ---- Items list ---- */
.dropzone__items {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* ---- Placeholder ---- */
.dropzone__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-3);
  color: var(--color-text-subtle);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  flex: 1;
}

.dropzone__placeholder-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-surface-alt);
  color: var(--color-text-subtle);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

/* ---- Pill variants per zone ---- */
.pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.4;
  user-select: none;
  transition: transform var(--transition-fast);
  min-height: 36px;
  border: 1px solid transparent;
}

.pill--indigo {
  background: var(--color-indigo-light);
  color: var(--color-indigo);
  border-color: var(--color-indigo);
}

.pill--coral {
  background: var(--color-coral-light);
  color: var(--color-coral);
  border-color: var(--color-coral);
}

.pill--amber {
  background: var(--color-amber-light);
  color: var(--color-amber);
  border-color: var(--color-amber);
}

.pill__label {
  white-space: nowrap;
}

.pill__agg {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 2px 4px;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.85;
}

.pill__agg:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 1px;
}

.pill__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.5;
  cursor: pointer;
  border-radius: 50%;
  transition: opacity var(--transition-fast), background var(--transition-fast);
  flex-shrink: 0;
}

.pill__remove:hover {
  opacity: 1;
  background: rgba(0,0,0,0.08);
}

@media (max-width: 700px) {
  .dropzone {
    min-height: 80px;
    padding: var(--space-2);
  }
}
</style>
