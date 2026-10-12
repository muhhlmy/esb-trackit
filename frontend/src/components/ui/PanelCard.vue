<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  actions: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-[6px] shadow-sm p-3" :class="$attrs.class">
    <div v-if="title || icon || $slots.header || actions.length" class="flex items-center justify-between gap-3 mb-3">
      <div class="flex items-center gap-2">
        <span v-if="icon" class="material-symbols-outlined text-dashboard-xl text-primary">{{ icon }}</span>
        <div>
          <h3 v-if="title" class="text-dashboard-base font-semibold">{{ title }}</h3>
          <p v-if="subtitle" class="text-dashboard-xs text-gray-500">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="actions.length" class="flex items-center gap-2">
        <slot name="actions">
          <button v-for="(a,i) in actions" :key="i" class="px-3 py-1.5 text-sm font-medium bg-primary text-white hover:bg-primary-dark rounded" @click="a.onClick">{{ a.label }}</button>
        </slot>
      </div>
    </div>
    <div class="panel-card__body">
      <slot />
    </div>
  </div>
</template>