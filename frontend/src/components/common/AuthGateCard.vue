<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, ShieldAlert } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: 'Masuk diperlukan',
  },
  description: {
    type: String,
    default: 'Silakan masuk untuk mengakses halaman ini.',
  },
  buttonText: {
    type: String,
    default: 'Masuk',
  },
  redirectPath: {
    type: String,
    default: '',
  },
})

const route = useRoute()
const router = useRouter()

const targetRedirect = computed(() => {
  return props.redirectPath || route.fullPath || '/'
})

function handleLoginRedirect() {
  router.push({
    path: '/login',
    query: { redirect: targetRedirect.value },
  })
}
</script>

<template>
  <div
    class="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 text-center shadow-sm select-none transition-all"
  >
    <div
      class="mx-auto w-10 h-10 rounded-2xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#333333] dark:text-indigo-400 flex items-center justify-center mb-3 border border-[#0A51B0]/20"
    >
      <ShieldAlert class="w-5 h-5" />
    </div>

    <h3
      class="text-[13px] sm:text-sm font-extrabold text-[#333333] dark:text-slate-100 tracking-tight"
    >
      {{ title }}
    </h3>

    <p
      class="mt-1.5 text-[11px] sm:text-xs text-[#5F7089] dark:text-slate-400 max-w-md mx-auto leading-relaxed"
    >
      {{ description }}
    </p>

    <div class="mt-4 flex justify-center">
      <button
        @click="handleLoginRedirect"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A51B0] hover:bg-[#0A4391] text-white text-[11px] sm:text-xs font-bold shadow-md shadow-[#0A51B0]/25 hover:shadow-lg transition-all cursor-pointer"
      >
        <LogIn class="w-4 h-4" />
        <span>{{ buttonText }}</span>
      </button>
    </div>
  </div>
</template>
