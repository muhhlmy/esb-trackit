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
.form-field { display:flex; flex-direction:column; gap:4px; }
.form-field__label {
  font-family: var(--font-family-sans);
  font-size: var(--fs-2xs, 10px);
  font-weight: 600;
  color: #334155;
}
.form-field__input {
  height: 28px; padding: 0 8px;
  border: 1px solid var(--ui-border, #e2e8f0);
  border-radius: var(--ui-radius-control, 5px);
  font-family: var(--font-family-sans);
  font-size: var(--fs-xs, 10.5px);
  background: var(--color-surface, #fff);
}
.form-field__error {
  font-family: var(--font-family-sans);
  font-size: var(--fs-2xs, 9px);
  color: #dc2626;
}
</style>
