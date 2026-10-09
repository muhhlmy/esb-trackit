<script setup>
defineProps({ variant:{type:String,default:'primary'}, size:{type:String,default:'md'} })
</script>
<template>
<button class="app-button" :class="[`app-button--${variant}`,`app-button--${size}`]"><slot/></button>
</template>
<style scoped>
.app-button{font-family:var(--font-family-sans);border-radius:var(--ui-radius-control,6px);border:1px solid var(--ui-border,#e2e8f0);background:var(--color-primary,#0a51b0);color:white;padding:6px 12px;font-size:var(--font-size-sm,12px);}
.app-button--md{height:32px;}
</style>
