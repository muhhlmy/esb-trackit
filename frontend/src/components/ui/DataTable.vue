<script setup>
defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  emptyText: { type: String, default: 'Tidak ada data' }
})
</script>

<template>
  <div class="data-table">
    <div v-if="title" class="data-table__title">{{ title }}</div>
    <div class="data-table__wrapper">
      <table v-if="rows.length" class="data-table__table">
        <thead>
          <tr>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <td v-for="col in columns" :key="col.key">
              <slot :name="`cell:${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="data-table__empty">{{ emptyText }}</div>
    </div>
  </div>
</template>

<style scoped>
.data-table { width:100%; }
.data-table__title {
  font-family: var(--font-family-sans);
  font-size: var(--fs-md, 12px);
  font-weight: 600;
  margin-bottom: 6px;
}
.data-table__wrapper { overflow-x:auto; }
.data-table__table { width:100%; border-collapse:collapse; font-family: var(--font-family-sans); }
.data-table__table th {
  font-size: var(--fs-2xs, 9px);
  font-weight: 600;
  text-align:left;
  padding: 5px 8px;
  border-bottom:1px solid var(--ui-border, #e2e8f0);
  background: #f8fafc;
}
.data-table__table td {
  font-size: var(--fs-xs, 10px);
  padding: 5px 8px;
  border-bottom:1px solid var(--ui-border, #e2e8f0);
}
.data-table__empty {
  font-family: var(--font-family-sans);
  font-size: var(--fs-2xs, 9.5px);
  color:#5B6B84;
  text-align:center;
  padding:16px;
}
</style>
