<script setup>
defineOptions({ name: 'UiCard' })
defineProps({ padding:{type:String,default:'12px'} })
</script>

<template>
  <div class="p-[{padding}] bg-white border border-gray-200 rounded-lg shadow-sm"><slot/></div>
</template>