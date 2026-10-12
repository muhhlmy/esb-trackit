<script setup>
defineProps({ variant: { type: String, default: 'primary' }, size: { type: String, default: 'md' } })
</script>

<template>
  <button :class="[
    'inline-flex items-center justify-center rounded-md font-medium transition-all active:scale-[0.98] cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none',
    variant === 'primary' ? 'bg-primary text-white hover:bg-primary-dark shadow-xs' :
    variant === 'secondary' ? 'bg-secondary text-white hover:bg-secondary-dark shadow-xs' :
    variant === 'success' ? 'bg-success text-white hover:bg-success-dark shadow-xs' :
    variant === 'warning' ? 'bg-warning text-white hover:bg-warning-dark shadow-xs' :
    variant === 'danger' ? 'bg-danger text-white hover:bg-danger-dark shadow-xs' :
    variant === 'link' ? 'text-primary hover:text-primary-dark border border-primary hover:border-primary-dark' :
    'border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900',
    size === 'sm' ? 'text-xs px-2.5 py-1.5 min-h-[30px]' :
    size === 'md' ? 'text-sm px-4 py-2 min-h-[38px]' :
    size === 'lg' ? 'text-base px-6 py-2.5 min-h-[44px]' : ''
  ]"><slot /></button>
</template>