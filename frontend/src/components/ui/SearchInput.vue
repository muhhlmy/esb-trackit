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
.search-input__icon { position:absolute; left:7px; font-size:14px; color:#94a3b8; }
.search-input__field { width:100%; height:28px; padding:0 24px 0 24px; border:1px solid var(--ui-border,#e2e8f0); border-radius:var(--ui-radius-control,5px); font-family:var(--font-family-sans); font-size:var(--fs-xs,10.5px); }
.search-input__clear { position:absolute; right:5px; background:none; border:none; font-size:14px; color:#94a3b8; cursor:pointer; }
</style>
