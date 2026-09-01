<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import Navbar from '@/components/layout/Navbar.vue';
import Footer from '@/components/layout/Footer.vue';
import MobileNav from '@/components/layout/MobileNav.vue';
import Toast from '@/components/common/Toast.vue';
import LoginModal from '@/components/common/LoginModal.vue';
import { useAuth } from '@/composables/useAuth';
import { useCases } from '@/composables/useCases';
import { useTheme } from '@/composables/useTheme';

const route = useRoute();
const { checkAuth } = useAuth();
const { fetchCases } = useCases();
useTheme(); // Ensure theme class initialized

// Hide Navbar, Footer, MobileNav in DocEditor mode
const isDocEditorRoute = computed(() => {
  return route.name === 'doc-editor' || (route.path && route.path.startsWith('/admin/editor'));
});

onMounted(() => {
  checkAuth();
  fetchCases();
});
</script>

<template>
  <div
    class="min-h-screen bg-[#f9f9fb] dark:bg-slate-950 text-[#1a1c1d] dark:text-slate-100 flex flex-col antialiased selection:bg-[#0040e5] selection:text-white pb-16 md:pb-0 transition-colors duration-200"
    :class="{ '!pb-0': isDocEditorRoute }"
  >
    <!-- Top Header (Hidden in DocEditor Mode) -->
    <Navbar v-if="!isDocEditorRoute" />

    <!-- View Route Container -->
    <div class="flex-1 flex flex-col">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>

    <!-- Global Footer (Hidden in DocEditor Mode) -->
    <Footer v-if="!isDocEditorRoute" />

    <!-- Mobile Bottom Navigation (Hidden in DocEditor Mode) -->
    <MobileNav v-if="!isDocEditorRoute" />

    <!-- Modals & Overlays -->
    <LoginModal />
    <Toast />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
