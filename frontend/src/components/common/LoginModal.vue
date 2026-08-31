<script setup>
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { Lock, User, Key, X, Loader2 } from 'lucide-vue-next';

const { isLoginModalOpen, login } = useAuth();

const username = ref('admin');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  if (!username.value || !password.value) {
    errorMessage.value = 'Username dan password wajib diisi.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  const success = await login(username.value, password.value);
  isSubmitting.value = false;

  if (success) {
    password.value = '';
  } else {
    errorMessage.value = 'Login gagal. Periksa username dan password Anda.';
  }
}

function closeModal() {
  isLoginModalOpen.value = false;
  errorMessage.value = '';
}
</script>

<template>
  <div
    v-if="isLoginModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
  >
    <div
      class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
    >
      <!-- Close Button -->
      <button
        @click="closeModal"
        class="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
      >
        <X class="w-5 h-5" />
      </button>

      <div class="flex items-center gap-3 mb-6">
        <div class="p-3 bg-[#f2f1ff] dark:bg-indigo-500/10 text-[#0040e5] dark:text-indigo-400 border border-[#c4c5d9] dark:border-indigo-500/20 rounded-xl">
          <Lock class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-[#1a1c1d] dark:text-slate-100">IT Portal &amp; Ticketing Login</h2>
          <p class="text-xs text-[#575d7a] dark:text-slate-400">Masuk untuk akses sistem ticketing &amp; kelola Playbook SOP</p>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="mb-4 p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300"
      >
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Username
          </label>
          <div class="relative">
            <User class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              v-model="username"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="Masukkan username"
              required
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Password
          </label>
          <div class="relative">
            <Key class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              v-model="password"
              type="password"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="Masukkan password"
              required
            />
          </div>
          <p class="text-[11px] text-slate-500 mt-1">Default credential: admin / admin123</p>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Loader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmitting ? 'Memproses...' : 'Sign In' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
