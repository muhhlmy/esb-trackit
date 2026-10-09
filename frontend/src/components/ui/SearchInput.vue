<script setup>
defineProps({ placeholder:{type:String,default:'Cari...'}, modelValue:{type:String,default:''} })
const emit = defineEmits(['update:modelValue'])
</script>
<template>
  <div class="search-input">
    <span class="material-symbols-outlined search-input__icon">search</span>
    <input :placeholder="placeholder" :value="modelValue" @input="e=>emit('update:modelValue', e.target.value)" class="search-input__field" />
    <button v-if="modelValue" class="search-input__clear" @click="emit('update:modelValue','')">clear</button>
  </div>
</template>
<style scoped>
.search-input { position:relative; display:flex; align-items:center; }
.search-input__icon { position:absolute; left:8px; font-size:16px; color:#94a3b8; }
.search-input__field { width:100%; height:32px; padding:0 28px 0 28px; border:1px solid var(--ui-border,#e2e8f0); border-radius:var(--ui-radius-control,6px); font-family:var(--font-family-sans); font-size:var(--font-size-sm,12px); }
.search-input__clear { position:absolute; right:6px; background:none; border:none; font-size:16px; color:#94a3b8; cursor:pointer; }
</style>
