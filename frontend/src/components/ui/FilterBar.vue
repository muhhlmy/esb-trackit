<script setup>
defineProps({
  searchPlaceholder: { type: String, default: 'Cari...' },
  showToggle: { type: Boolean, default: true }
})
const emit = defineEmits(['search', 'filter'])
</script>

<template>
  <div class="filter-bar">
    <div class="filter-bar__search">
      <span class="material-symbols-outlined filter-bar__icon">search</span>
      <input :placeholder="searchPlaceholder" @input="e => emit('search', e.target.value)" class="filter-bar__input" />
    </div>
    <div class="filter-bar__actions">
      <button class="filter-bar__btn" @click="emit('filter')">Filter</button>
      <slot name="extra" />
    </div>
  </div>
</template>

<style scoped>
.filter-bar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.filter-bar__search { position:relative; flex:1; min-width:200px; }
.filter-bar__icon { position:absolute; left:8px; top:50%; transform:translateY(-50%); font-size:16px; color:#94a3b8; }
.filter-bar__input {
  width:100%; height:32px; padding:0 8px 0 28px;
  border:1px solid var(--ui-border, #e2e8f0); border-radius:var(--ui-radius-control,6px);
  font-family:var(--font-family-sans); font-size:var(--font-size-sm,12px);
  background:var(--color-surface,#fff);
}
.filter-bar__btn {
  height:32px; padding:0 12px; border-radius:var(--ui-radius-control,6px);
  border:1px solid var(--ui-border, #e2e8f0); background:var(--color-surface,#fff);
  font-family:var(--font-family-sans); font-size:var(--font-size-sm,12px); font-weight:500;
}
</style>
