<script setup>
defineProps({ variant: { type: String, default: 'primary' }, size: { type: String, default: 'md' } })
</script>
<template>
  <button class="app-button" :class="[`app-button--${variant}`, `app-button--${size}`]"><slot /></button>
</template>
<style scoped>
.app-button {
  font-family: var(--font-family-sans);
  border-radius: var(--ui-radius-control, 5px);
  border: 1px solid var(--ui-border, #e2e8f0);
  background: var(--color-primary, #0a51b0);
  color: white;
  padding: 4px 10px;
  font-size: var(--fs-xs, 10px);
  font-weight: 550;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
}
.app-button--sm {
  height: 24px;
  padding: 2px 7px;
  font-size: 9px;
}
.app-button--md {
  height: 28px;
}
.app-button--lg {
  height: 32px;
  padding: 5px 12px;
  font-size: 11px;
}
</style>
