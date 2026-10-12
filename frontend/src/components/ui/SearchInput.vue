<script setup>
defineProps({ placeholder:{type:String,default:'Cari...'}, modelValue:{type:String,default:''} })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative flex items-center w-full">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">search</span>
    <input :placeholder="placeholder" :value="modelValue" @input="e=>emit('update:modelValue', e.target.value)" class="flex-1 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
    <button v-if="modelValue" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer" @click="emit('update:modelValue','')">clear</button>
  </div>
</template>