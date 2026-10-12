<script setup>
defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  title: { type: String, default: '' },
  emptyText: { type: String, default: 'Tidak ada data' }
})
</script>

<template>
  <div class="w-full">
    <div v-if="title" class="mb-2 text-sm font-semibold text-gray-700">{{ title }}</div>
    <div class="overflow-x-auto">
      <table v-if="rows.length" class="w-full text-sm text-left rtl:text-right border-collapse">
        <thead>
          <tr class="border-b">
            <th v-for="col in columns" :key="col.key" class="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-200 bg-gray-50">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i" class="border-b hover:bg-gray-50">
            <td v-for="col in columns" :key="col.key" class="px-4 py-2">
              <slot :name="`cell:${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="px-4 py-4 text-sm text-center text-gray-500">{{ emptyText }}</div>
    </div>
  </div>
</template>