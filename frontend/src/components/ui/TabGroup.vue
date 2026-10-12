<script setup>
defineProps({ tabs:{type:Array,default:()=>[]}, modelValue:{type:String,default:''} })
const emit=defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex space-x-1">
    <button v-for="t in tabs" :key="t.value"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors',
              modelValue === t.value ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
            ]"
            @click="emit('update:modelValue', t.value)">
      {{ t.label }}
    </button>
  </div>
</template>