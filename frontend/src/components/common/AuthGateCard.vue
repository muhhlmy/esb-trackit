<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, ShieldAlert } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: 'Sign in required',
  },
  description: {
    type: String,
    default: 'Please sign in to access your tickets and create a support request.',
  },
  buttonText: {
    type: String,
    default: 'Sign In to Continue',
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
    class="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 text-center shadow-sm select-none transition-all"
  >
    <div
      class="mx-auto w-12 h-12 rounded-2xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-400 flex items-center justify-center mb-4 border border-[#5D87FF]/20"
    >
      <ShieldAlert class="w-6 h-6" />
    </div>

    <h3 class="text-base sm:text-lg font-extrabold text-[#0F172A] dark:text-slate-100 tracking-tight">
      {{ title }}
    </h3>

    <p class="mt-1.5 text-xs sm:text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
      {{ description }}
    </p>

    <div class="mt-6 flex justify-center">
      <button
        @click="handleLoginRedirect"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5D87FF] hover:bg-[#4570EA] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#5D87FF]/25 hover:shadow-lg transition-all cursor-pointer active:scale-95"
      >
        <LogIn class="w-4 h-4" />
        <span>{{ buttonText }}</span>
      </button>
    </div>
  </div>
</template>
