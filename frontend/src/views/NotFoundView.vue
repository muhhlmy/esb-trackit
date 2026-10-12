<template>
  <div class="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 px-4">
    <div class="text-center">
      <div class="mb-4 text-[96px] font-extrabold leading-none text-[#64748B] select-none">404</div>
      <h1 class="mb-2 text-[18px] font-bold text-[#333333] dark:text-white">{{ t('not_found_title') }}</h1>
      <p class="mb-8 max-w-sm text-[12px] text-[#5F7089] dark:text-slate-400">
        {{ t('not_found_desc') }}
      </p>
      <router-link
        to="/"
        class="inline-flex items-center gap-2 rounded-[6px] bg-[#0A51B0] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0A4391] transition-all cursor-pointer"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">home</span>
        {{ t('back_to_home') }}
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { useLanguage } from '@/composables/useLanguage.js'

const { t } = useLanguage()
</script>
