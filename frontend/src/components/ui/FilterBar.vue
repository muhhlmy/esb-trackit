<script setup>
defineProps({
  searchPlaceholder: { type: String, default: 'Cari...' },
  showToggle: { type: Boolean, default: true }
})
const emit = defineEmits(['search', 'filter'])
</script>

<template>
  <div class="flex items-center flex-wrap gap-2">
    <div class="relative flex items-center w-full">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
      <input :placeholder="searchPlaceholder" @input="e => emit('search', e.target.value)" class="flex-1 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
    </div>
    <button @click="emit('filter')" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">Filter</button>
    <slot name="extra" />
  </div>
</template>