<script setup>
defineProps({ tabs:{type:Array,default:()=>[]}, modelValue:{type:String,default:''} })
const emit=defineEmits(['update:modelValue'])
</script>
<template>
<div class="tab-group"><button v-for="t in tabs" :key="t.value" :class="['tab', {active:modelValue===t.value}]" @click="emit('update:modelValue',t.value)">{{t.label}}</button></div>
</template>
<style scoped>
.tab-group{display:flex;gap:4px;border-bottom:1px solid var(--ui-border,#e2e8f0);}
.tab{padding:6px 12px;font-family:var(--font-family-sans);font-size:var(--font-size-sm,12px);background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;}
.tab.active{border-color:var(--color-primary,#0a51b0);font-weight:600;}
</style>
