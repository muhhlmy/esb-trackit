<script setup>
defineProps({
  label: { type: String, default: '' },
  name: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" :for="name" class="text-sm font-semibold text-gray-700">{{ label }}</label>
    <input :id="name" :name="name" :type="type" :placeholder="placeholder" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>
