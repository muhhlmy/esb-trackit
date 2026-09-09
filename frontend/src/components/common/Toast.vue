<script setup>
defineOptions({ name: 'AppToast' })
import { useToast } from '@/composables/useToast'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all text-sm font-medium"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
        :class="{
          'bg-emerald-950/90 text-emerald-200 border-emerald-800/60': toast.type === 'success',
          'bg-rose-950/90 text-rose-200 border-rose-800/60': toast.type === 'error',
          'bg-slate-900/90 text-slate-200 border-slate-700/60': toast.type === 'info',
        }"
      >
        <div class="flex items-center gap-3">
          <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-400 shrink-0" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-rose-400 shrink-0" />
          <Info v-else class="w-5 h-5 text-indigo-400 shrink-0" />
          <span>{{ toast.message }}</span>
        </div>

        <button
          @click="removeToast(toast.id)"
          class="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          :aria-label="toast.type === 'error' ? 'Tutup notifikasi error' : 'Tutup notifikasi'"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
