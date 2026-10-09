<script setup>
defineProps({ title:String, subtitle:String })
</script>
<template>
<div class="app-page">
  <slot name="header" />
  <slot name="filter" />
  <slot name="kpi" />
  <slot name="content" />
</div>
</template>
<style scoped>
.app-page{display:grid;gap:16px;}
</style>
