<script setup>
defineProps({ padding:{type:String,default:'12px'} })
</script>
<template>
<div class="ui-card" :style="{padding}"><slot/></div>
</template>
<style scoped>
.ui-card{background:var(--color-surface,#fff);border:1px solid var(--ui-border,#e2e8f0);border-radius:var(--ui-radius-card,6px);box-shadow:var(--ui-shadow-card,0 1px 3px rgba(15,23,42,0.04));}
</style>
