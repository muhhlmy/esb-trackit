<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  actions: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="panel-card" :class="$attrs.class">
    <div v-if="title || icon || $slots.header || actions.length" class="panel-card__header">
      <div class="panel-card__title-row">
        <span v-if="icon" class="panel-card__icon material-symbols-outlined">{{ icon }}</span>
        <div class="panel-card__titles">
          <h3 v-if="title" class="panel-card__title">{{ title }}</h3>
          <p v-if="subtitle" class="panel-card__subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="actions.length" class="panel-card__actions">
        <slot name="actions">
          <button v-for="(a,i) in actions" :key="i" class="panel-card__action" @click="a.onClick">{{ a.label }}</button>
        </slot>
      </div>
    </div>
    <div class="panel-card__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.panel-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--ui-border, #e2e8f0);
  border-radius: var(--ui-radius-card, 6px);
  box-shadow: var(--ui-shadow-card, 0 1px 3px rgba(15,23,42,0.04));
  padding: var(--ui-card-padding, 12px);
}
@media (max-width: 639px){
  .panel-card { padding: var(--ui-card-padding-mobile, 10px); }
}
.panel-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.panel-card__title-row { display: flex; gap: 8px; align-items: center; }
.panel-card__icon { font-size: 18px; color: var(--color-primary, #0a51b0); }
.panel-card__title {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base, 14px);
  font-weight: 600;
  margin: 0;
  line-height: 1.35;
}
@media (max-width:639px){
  .panel-card__title { font-size: var(--font-size-md, 13px); }
}
.panel-card__subtitle {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-xs, 11px);
  color: #64748b;
  margin: 2px 0 0;
}
.panel-card__body { margin-top: 4px; }
</style>
