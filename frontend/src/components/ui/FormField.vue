<script setup>
defineProps({
  label: { type: String, default: '' },
  name: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' }
})
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="name" class="form-field__label">{{ label }}</label>
    <input :id="name" :name="name" :type="type" :placeholder="placeholder" class="form-field__input" />
    <p v-if="error" class="form-field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.form-field { display:flex; flex-direction:column; gap:6px; }
.form-field__label {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-sm,12px);
  font-weight: 500;
  color: #334155;
}
.form-field__input {
  height:36px; padding:0 10px;
  border:1px solid var(--ui-border,#e2e8f0);
  border-radius: var(--ui-radius-control,6px);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-sm,12px);
  background: var(--color-surface,#fff);
}
.form-field__error {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-xs,11px);
  color:#dc2626;
}
</style>
