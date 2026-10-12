<template>
  <section class="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-6 text-center">
    <div class="rounded-[6px] border border-[#E5EAEF] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-card">
      <span aria-hidden="true" class="material-symbols-outlined mb-2 text-[36px] text-[#FA896B]"
        >lock</span
      >
      <h1 class="text-sm font-bold text-[#2A3547] dark:text-white">{{ t('access_denied_title') }}</h1>
      <p class="mt-1.5 text-xs text-[#66728d] dark:text-slate-400">
        {{ t('access_denied_desc') }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { useLanguage } from '@/composables/useLanguage.js'

const { t } = useLanguage()
</script>
