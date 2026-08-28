<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const { login } = useAuth()
const { post } = useApi()

const isMounting = ref(true)
const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const emailInput = ref(null)

// ── State Forgot Password / OTP Flow ──
const showForgotModal = ref(false)
const forgotStep = ref(1) // 1: Email, 2: OTP, 3: Password Baru, 4: Selesai
const forgotEmail = ref('')
const otpDigits = ref(['', '', '', '', '', ''])
const forgotNewPassword = ref('')
const forgotConfirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const forgotLoading = ref(false)
const forgotError = ref('')
const forgotSuccessMsg = ref('')
const resetToken = ref('')

// Countdown timers
const resendCooldown = ref(0)
const otpExpirySeconds = ref(300) // 5 menit = 300 detik
let resendInterval = null
let expiryInterval = null

const otpInputRefs = ref([])

onMounted(() => {
  const img = new Image()
  img.src = '/ESB Logo.svg'
  const finishMounting = () => {
    setTimeout(() => {
      isMounting.value = false
    }, 120)
  }
  img.onload = finishMounting
  img.onerror = finishMounting

  setTimeout(() => {
    if (isMounting.value) isMounting.value = false
  }, 800)
})

onUnmounted(() => {
  clearInterval(resendInterval)
  clearInterval(expiryInterval)
})

watch(isMounting, async (mounting) => {
  if (!mounting) {
    await nextTick()
    emailInput.value?.focus()
  }
})

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Email dan kata sandi wajib diisi.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await login(email.value, password.value, rememberMe.value)

    if (response.user.role === 'user') {
      router.push('/my-assets')
    } else {
      router.push('/')
    }
  } catch (error) {
    errorMessage.value = error.message || 'Login gagal. Periksa kembali kredensial Anda.'
  } finally {
    isLoading.value = false
  }
}

// ── Forgot Password Handlers ──

const startResendTimer = (seconds = 60) => {
  clearInterval(resendInterval)
  resendCooldown.value = seconds
  resendInterval = setInterval(() => {
    if (resendCooldown.value > 0) {
      resendCooldown.value--
    } else {
      clearInterval(resendInterval)
    }
  }, 1000)
}

const startExpiryTimer = (seconds = 300) => {
  clearInterval(expiryInterval)
  otpExpirySeconds.value = seconds
  expiryInterval = setInterval(() => {
    if (otpExpirySeconds.value > 0) {
      otpExpirySeconds.value--
    } else {
      clearInterval(expiryInterval)
    }
  }, 1000)
}

const formatTimer = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

const openForgotModal = () => {
  showForgotModal.value = true
  forgotStep.value = 1
  forgotEmail.value = email.value || ''
  forgotError.value = ''
  forgotSuccessMsg.value = ''
  otpDigits.value = ['', '', '', '', '', '']
  forgotNewPassword.value = ''
  forgotConfirmPassword.value = ''
  resetToken.value = ''
  clearInterval(resendInterval)
  clearInterval(expiryInterval)
}

const closeForgotModal = () => {
  showForgotModal.value = false
  clearInterval(resendInterval)
  clearInterval(expiryInterval)
}

// Step 1: Request OTP
const handleRequestOtp = async () => {
  if (!forgotEmail.value || !forgotEmail.value.includes('@')) {
    forgotError.value = 'Silakan masukkan alamat email yang valid.'
    return
  }

  forgotLoading.value = true
  forgotError.value = ''
  forgotSuccessMsg.value = ''

  try {
    const res = await post('/api/auth/forgot-password', { email: forgotEmail.value })
    forgotSuccessMsg.value = res.message || 'Kode OTP telah dikirim ke email Anda.'
    forgotStep.value = 2
    otpDigits.value = ['', '', '', '', '', '']
    startResendTimer(60)
    startExpiryTimer(300) // 5 menit

    await nextTick()
    otpInputRefs.value[0]?.focus()
  } catch (error) {
    forgotError.value = error.message || 'Gagal mengirim kode OTP. Coba lagi nanti.'
  } finally {
    forgotLoading.value = false
  }
}

// Step 2: Resend OTP
const handleResendOtp = async () => {
  if (resendCooldown.value > 0 || forgotLoading.value) return
  await handleRequestOtp()
}

// OTP digit input management
const handleOtpInput = (index, event) => {
  const val = event.target.value
  if (!/^\d*$/.test(val)) {
    otpDigits.value[index] = ''
    return
  }

  // Jika input 1 karakter, simpan dan pindah ke input berikutnya
  if (val.length >= 1) {
    otpDigits.value[index] = val.slice(-1)
    if (index < 5) {
      otpInputRefs.value[index + 1]?.focus()
    }
  }
}

const handleOtpKeyDown = (index, event) => {
  if (event.key === 'Backspace' && !otpDigits.value[index] && index > 0) {
    otpInputRefs.value[index - 1]?.focus()
  }
}

const handleOtpPaste = (event) => {
  event.preventDefault()
  const pasted = (event.clipboardData || window.clipboardData).getData('text').trim()
  if (/^\d{6}$/.test(pasted)) {
    const digits = pasted.split('')
    digits.forEach((d, i) => {
      if (i < 6) otpDigits.value[i] = d
    })
    otpInputRefs.value[5]?.focus()
  }
}

// Step 2: Verify OTP
const handleVerifyOtp = async () => {
  const fullOtp = otpDigits.value.join('')
  if (fullOtp.length !== 6) {
    forgotError.value = 'Harap masukkan 6 digit kode OTP lengkap.'
    return
  }

  if (otpExpirySeconds.value <= 0) {
    forgotError.value = 'Kode OTP telah kadaluarsa. Silakan minta kode baru.'
    return
  }

  forgotLoading.value = true
  forgotError.value = ''

  try {
    const res = await post('/api/auth/verify-reset-otp', {
      email: forgotEmail.value,
      otp: fullOtp,
    })
    resetToken.value = res.resetToken
    forgotStep.value = 3
    forgotSuccessMsg.value = ''
  } catch (error) {
    forgotError.value = error.message || 'Kode OTP tidak valid atau kadaluarsa.'
  } finally {
    forgotLoading.value = false
  }
}

// Step 3: Set New Password
const handleResetPassword = async () => {
  if (!forgotNewPassword.value || forgotNewPassword.value.length < 8) {
    forgotError.value = 'Kata sandi baru minimal harus 8 karakter.'
    return
  }

  if (forgotNewPassword.value !== forgotConfirmPassword.value) {
    forgotError.value = 'Konfirmasi kata sandi tidak cocok.'
    return
  }

  forgotLoading.value = true
  forgotError.value = ''

  try {
    await post('/api/auth/reset-password', {
      email: forgotEmail.value,
      resetToken: resetToken.value,
      newPassword: forgotNewPassword.value,
    })

    forgotStep.value = 4 // Success
    clearInterval(resendInterval)
    clearInterval(expiryInterval)
  } catch (error) {
    forgotError.value = error.message || 'Gagal mereset kata sandi. Silakan coba lagi.'
  } finally {
    forgotLoading.value = false
  }
}

// Complete & back to login
const finishResetAndLogin = () => {
  email.value = forgotEmail.value
  password.value = ''
  closeForgotModal()
  errorMessage.value = ''
}
</script>

<template>
  <!-- Outer Container - Exact 100dvh viewport without scrollbar -->
  <div
    class="h-screen h-dvh w-full overflow-hidden bg-[#FAFAFA] font-sans antialiased text-slate-900 flex flex-col md:flex-row select-none relative"
  >
    <!-- ── Skeleton Loading State ── -->
    <template v-if="isMounting">
      <!-- Left Branding Skeleton -->
      <div
        class="hidden md:flex md:w-[42%] lg:w-[40%] xl:w-[38%] bg-[#F4F6F9] border-r border-slate-200/60 p-8 lg:p-14 flex-col justify-between animate-pulse"
      >
        <div class="flex items-center justify-between">
          <div class="h-8 w-28 bg-slate-200/80 rounded-lg"></div>
          <div class="h-5 w-24 bg-slate-200/60 rounded-full"></div>
        </div>
        <div class="space-y-4 max-w-sm my-auto">
          <div class="h-10 w-44 bg-slate-200/80 rounded-xl"></div>
          <div class="h-4 w-full bg-slate-200/60 rounded-lg"></div>
          <div class="h-4 w-4/5 bg-slate-200/60 rounded-lg"></div>
        </div>
        <div class="h-4 w-36 bg-slate-200/60 rounded"></div>
      </div>

      <!-- Right Form Skeleton -->
      <div class="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
        <div class="w-full max-w-[380px] space-y-6 animate-pulse">
          <div class="space-y-2">
            <div class="h-7 w-56 bg-slate-200 rounded-lg"></div>
            <div class="h-4 w-40 bg-slate-100 rounded"></div>
          </div>
          <div class="space-y-4 pt-2">
            <div class="h-11 w-full bg-slate-100 rounded-xl"></div>
            <div class="h-11 w-full bg-slate-100 rounded-xl"></div>
            <div class="h-4 w-28 bg-slate-100 rounded"></div>
            <div class="h-11 w-full bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Actual Content ── -->
    <template v-else>
      <!-- ── Left Column: Brand Presentation Panel (Desktop) ── -->
      <div
        class="hidden md:flex md:w-[42%] lg:w-[40%] xl:w-[38%] bg-[#F8FAFC] border-r border-slate-200/70 p-8 lg:p-12 xl:p-14 flex-col justify-between relative overflow-hidden shrink-0"
      >
        <!-- Subtle Ambient Radial Light -->
        <div
          class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0892F5]/[0.035] blur-3xl pointer-events-none"
        ></div>
        <div
          class="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#0A51B0]/[0.025] blur-3xl pointer-events-none"
        ></div>

        <!-- Ultra-subtle Enterprise Grid Pattern -->
        <svg
          class="absolute inset-0 w-full h-full stroke-slate-300/[0.25] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,white_30%,transparent_85%)]"
          aria-hidden="true"
        >
          <defs>
            <pattern id="brand-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M0 32V.5H32" fill="none" stroke-dasharray="2 2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" stroke-width="0" fill="url(#brand-grid-pattern)" />
        </svg>

        <!-- Top Header: Brand Logo -->
        <div class="relative z-10 flex items-center justify-between">
          <img src="/ESB Logo.svg" alt="ESB People Technology Logo" class="h-7 lg:h-8 w-auto object-contain" />
        </div>

        <!-- Middle Focal Point: Brand Statement & Typography -->
        <div class="relative z-10 max-w-sm space-y-6 my-auto py-8 transition-all duration-300">
          <div class="space-y-2">
            <div
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] tracking-wide uppercase"
            >
              <span>IT Assets Monitoring</span>
            </div>
            <h1
              class="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
            >
              TrackIT
            </h1>
          </div>

          <p class="text-sm lg:text-base text-slate-700 font-normal leading-relaxed">
            Platform terpadu untuk pengawasan aset IT, inventarisasi perangkat, dan manajemen tiket
            support secara real-time.
          </p>

          <!-- Minimal Feature Badges -->
          <div class="pt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-700">
            <div
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-300/80 text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-[#1D4ED8]">inventory_2</span>
              <span>Asset Control</span>
            </div>
            <div
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-300/80 text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-[#1D4ED8]">devices</span>
              <span>Health Monitoring</span>
            </div>
            <div
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 border border-slate-300/80 text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-[#1D4ED8]"
                >confirmation_number</span
              >
              <span>Support Desk</span>
            </div>
          </div>
        </div>

        <!-- Bottom Footer -->
        <div
          class="relative z-10 flex items-center justify-between text-xs text-slate-600 font-medium"
        >
          <span>&copy; 2026 ESB People Technology</span>
          <span class="text-[11px] text-slate-600 font-medium">#AhlinyaBisnisKuliner</span>
        </div>
      </div>

      <!-- ── Right Column: Login Panel ── -->
      <div
        class="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white relative z-10 overflow-y-auto sm:overflow-hidden h-full"
      >
        <!-- Mobile Header (Visible on small screens) -->
        <div
          class="flex md:hidden items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0"
        >
          <img src="/ESB Logo.svg" alt="ESB People Technology Logo" class="h-7 w-auto object-contain" />
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] font-semibold text-slate-700"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true"></span>
            <span>TrackIT Enterprise</span>
          </div>
        </div>

        <!-- Form Container -->
        <div
          class="w-full max-w-[380px] sm:max-w-[400px] mx-auto my-auto py-4 sm:py-6 flex flex-col justify-center animate-fade-in"
        >
          <!-- Heading Section -->
          <div class="mb-6 sm:mb-8">
            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Selamat datang kembali
            </h2>
            <p class="mt-1.5 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Masuk dengan akun enterprise Anda untuk melanjutkan.
            </p>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start gap-2.5 transition-all"
            role="alert"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-red-700 text-[18px] mt-0.5 shrink-0"
              >error</span
            >
            <p class="text-xs font-semibold text-red-800 leading-relaxed">{{ errorMessage }}</p>
          </div>

          <!-- Authentication Form -->
          <form @submit.prevent="handleLogin" class="space-y-4">
            <!-- Email / Username Input -->
            <div class="space-y-1.5">
              <label for="email" class="block text-xs font-bold text-slate-800">
                Email atau nama pengguna
              </label>
              <div class="relative">
                <span
                  class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[18px]">mail</span>
                </span>
                <input
                  id="email"
                  ref="emailInput"
                  v-model="email"
                  type="text"
                  required
                  autocomplete="username"
                  placeholder="admin@esb.co.id"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-all duration-150 placeholder:text-slate-500 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-1.5">
              <label for="password" class="block text-xs font-bold text-slate-800">
                Kata sandi
              </label>
              <div class="relative">
                <span
                  class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[18px]">lock</span>
                </span>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 transition-all duration-150 placeholder:text-slate-500 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 transition-colors focus:outline-none focus:text-slate-700"
                  :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                  tabindex="-1"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[18px] block">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Remember Me & Forgot Password Controls -->
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                  class="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 accent-[#2563EB] cursor-pointer"
                />
                <span
                  class="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors"
                >
                  Ingat saya
                </span>
              </label>

              <!-- Link Lupa Password -->
              <button
                type="button"
                @click="openForgotModal"
                class="text-xs sm:text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition-all cursor-pointer focus:outline-none"
              >
                Lupa kata sandi?
              </button>
            </div>

            <!-- Primary Submit Button -->
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full h-11 mt-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all duration-150 shadow-xs active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span v-if="isLoading" class="flex items-center gap-2">
                <span aria-hidden="true" class="material-symbols-outlined animate-spin text-[18px]"
                  >progress_activity</span
                >
                <span>Masuk...</span>
              </span>
              <template v-else>
                <span>Masuk</span>
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[18px] transition-transform duration-150 group-hover:translate-x-0.5"
                  >arrow_forward</span
                >
              </template>
            </button>
          </form>

          <!-- Form Footer (Mobile & Subtle baseline) -->
          <div class="mt-8 text-center text-xs text-slate-400 font-normal md:hidden">
            &copy; 2026 ESB People Technology
          </div>
        </div>

        <!-- Whitespace Spacer for Desktop layout balancing -->
        <div class="hidden sm:block shrink-0 h-4"></div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- ── MODAL LUPA PASSWORD / RESET PASSWORD DENGAN OTP ── -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showForgotModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm select-none"
        >
          <div
            class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up"
            @click.stop
          >
            <!-- Modal Header -->
            <div class="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                  <span class="material-symbols-outlined text-[20px]">lock_reset</span>
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">Reset Kata Sandi</h3>
                  <p class="text-xs text-slate-500">Verifikasi email dengan kode OTP</p>
                </div>
              </div>
              <button
                @click="closeForgotModal"
                class="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <!-- Stepper Progress Dots -->
            <div class="px-6 pt-4 pb-2 flex items-center justify-center gap-2">
              <div
                class="flex items-center gap-1.5 text-xs font-semibold"
                :class="forgotStep >= 1 ? 'text-[#2563EB]' : 'text-slate-400'"
              >
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  :class="forgotStep >= 1 ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'"
                  >1</span
                >
                <span>Email</span>
              </div>
              <div class="w-6 h-0.5 bg-slate-200" :class="{ 'bg-[#2563EB]': forgotStep >= 2 }"></div>
              <div
                class="flex items-center gap-1.5 text-xs font-semibold"
                :class="forgotStep >= 2 ? 'text-[#2563EB]' : 'text-slate-400'"
              >
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  :class="forgotStep >= 2 ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'"
                  >2</span
                >
                <span>Kode OTP</span>
              </div>
              <div class="w-6 h-0.5 bg-slate-200" :class="{ 'bg-[#2563EB]': forgotStep >= 3 }"></div>
              <div
                class="flex items-center gap-1.5 text-xs font-semibold"
                :class="forgotStep >= 3 ? 'text-[#2563EB]' : 'text-slate-400'"
              >
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  :class="forgotStep >= 3 ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'"
                  >3</span
                >
                <span>Password Baru</span>
              </div>
            </div>

            <!-- Modal Body Content -->
            <div class="p-6">
              <!-- Error Alert in Modal -->
              <div
                v-if="forgotError"
                class="mb-4 rounded-xl bg-red-50 p-3 border border-red-200 flex items-start gap-2.5"
                role="alert"
              >
                <span class="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">error</span>
                <p class="text-xs font-semibold text-red-800 leading-snug">{{ forgotError }}</p>
              </div>

              <!-- Success Alert in Modal -->
              <div
                v-if="forgotSuccessMsg && forgotStep !== 4"
                class="mb-4 rounded-xl bg-emerald-50 p-3 border border-emerald-200 flex items-start gap-2.5"
                role="alert"
              >
                <span class="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                <p class="text-xs font-semibold text-emerald-800 leading-snug">{{ forgotSuccessMsg }}</p>
              </div>

              <!-- ── STEP 1: Masukkan Email ── -->
              <div v-if="forgotStep === 1" class="space-y-4">
                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Masukkan alamat email akun Anda. Kami akan mengirimkan <strong>6 digit kode verifikasi (OTP)</strong> yang berlaku selama <strong>5 menit</strong>.
                </p>

                <form @submit.prevent="handleRequestOtp" class="space-y-4">
                  <div class="space-y-1.5">
                    <label for="forgot-email" class="block text-xs font-bold text-slate-800">
                      Alamat Email Terdaftar
                    </label>
                    <div class="relative">
                      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                        <span class="material-symbols-outlined text-[18px]">mail</span>
                      </span>
                      <input
                        id="forgot-email"
                        v-model="forgotEmail"
                        type="email"
                        required
                        placeholder="nama@esb.co.id"
                        class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    :disabled="forgotLoading"
                    class="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    <span v-if="forgotLoading" class="flex items-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Mengirim OTP...</span>
                    </span>
                    <span v-else class="flex items-center gap-2">
                      <span>Kirim Kode OTP</span>
                      <span class="material-symbols-outlined text-[18px]">send</span>
                    </span>
                  </button>
                </form>
              </div>

              <!-- ── STEP 2: Masukkan Kode OTP ── -->
              <div v-else-if="forgotStep === 2" class="space-y-5">
                <div class="text-center">
                  <p class="text-xs sm:text-sm text-slate-600">
                    Kode verifikasi telah dikirimkan ke:
                  </p>
                  <p class="text-sm font-bold text-slate-900 mt-0.5">
                    {{ forgotEmail }}
                  </p>
                  <div class="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                    <span class="material-symbols-outlined text-[14px]">timer</span>
                    <span>Berlaku: {{ formatTimer(otpExpirySeconds) }}</span>
                  </div>
                </div>

                <!-- 6-digit OTP Input Boxes -->
                <div class="space-y-2">
                  <label class="block text-center text-xs font-bold text-slate-700">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <div class="flex justify-center gap-2 sm:gap-2.5" @paste="handleOtpPaste">
                    <input
                      v-for="(digit, idx) in otpDigits"
                      :key="idx"
                      :ref="(el) => (otpInputRefs[idx] = el)"
                      v-model="otpDigits[idx]"
                      type="text"
                      inputmode="numeric"
                      maxlength="1"
                      class="w-11 h-12 text-center text-xl font-bold rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 transition-all"
                      @input="handleOtpInput(idx, $event)"
                      @keydown="handleOtpKeyDown(idx, $event)"
                    />
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="space-y-3 pt-2">
                  <button
                    type="button"
                    :disabled="forgotLoading || otpDigits.join('').length !== 6 || otpExpirySeconds <= 0"
                    @click="handleVerifyOtp"
                    class="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span v-if="forgotLoading" class="flex items-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Memverifikasi...</span>
                    </span>
                    <span v-else class="flex items-center gap-1.5">
                      <span>Verifikasi OTP</span>
                      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </span>
                  </button>

                  <div class="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      @click="forgotStep = 1"
                      class="text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      &larr; Ganti Email
                    </button>

                    <button
                      type="button"
                      :disabled="resendCooldown > 0 || forgotLoading"
                      @click="handleResendOtp"
                      class="font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <span v-if="resendCooldown > 0">Kirim ulang dalam {{ resendCooldown }}s</span>
                      <span v-else>Kirim Ulang Kode OTP</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- ── STEP 3: Password Baru ── -->
              <div v-else-if="forgotStep === 3" class="space-y-4">
                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Kode OTP terverifikasi! Masukkan kata sandi baru untuk akun Anda.
                </p>

                <form @submit.prevent="handleResetPassword" class="space-y-3.5">
                  <!-- Password Baru -->
                  <div class="space-y-1.5">
                    <label for="new-password" class="block text-xs font-bold text-slate-800">
                      Kata Sandi Baru
                    </label>
                    <div class="relative">
                      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                        <span class="material-symbols-outlined text-[18px]">lock</span>
                      </span>
                      <input
                        id="new-password"
                        v-model="forgotNewPassword"
                        :type="showNewPassword ? 'text' : 'password'"
                        required
                        placeholder="Minimal 8 karakter"
                        class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                      <button
                        type="button"
                        @click="showNewPassword = !showNewPassword"
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                        tabindex="-1"
                      >
                        <span class="material-symbols-outlined text-[18px] block">
                          {{ showNewPassword ? 'visibility_off' : 'visibility' }}
                        </span>
                      </button>
                    </div>
                  </div>

                  <!-- Konfirmasi Password Baru -->
                  <div class="space-y-1.5">
                    <label for="confirm-password" class="block text-xs font-bold text-slate-800">
                      Ulangi Kata Sandi Baru
                    </label>
                    <div class="relative">
                      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                        <span class="material-symbols-outlined text-[18px]">lock_clock</span>
                      </span>
                      <input
                        id="confirm-password"
                        v-model="forgotConfirmPassword"
                        :type="showConfirmPassword ? 'text' : 'password'"
                        required
                        placeholder="Ketik ulang kata sandi baru"
                        class="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                      <button
                        type="button"
                        @click="showConfirmPassword = !showConfirmPassword"
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                        tabindex="-1"
                      >
                        <span class="material-symbols-outlined text-[18px] block">
                          {{ showConfirmPassword ? 'visibility_off' : 'visibility' }}
                        </span>
                      </button>
                    </div>
                  </div>

                  <!-- Requirements helper -->
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                    <div class="flex items-center gap-1.5" :class="forgotNewPassword.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-slate-500'">
                      <span class="material-symbols-outlined text-[15px]">{{ forgotNewPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked' }}</span>
                      <span>Minimal 8 karakter</span>
                    </div>
                    <div class="flex items-center gap-1.5" :class="forgotNewPassword && forgotNewPassword === forgotConfirmPassword ? 'text-emerald-600 font-semibold' : 'text-slate-500'">
                      <span class="material-symbols-outlined text-[15px]">{{ forgotNewPassword && forgotNewPassword === forgotConfirmPassword ? 'check_circle' : 'radio_button_unchecked' }}</span>
                      <span>Kata sandi cocok</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    :disabled="forgotLoading || forgotNewPassword.length < 8 || forgotNewPassword !== forgotConfirmPassword"
                    class="w-full h-11 mt-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span v-if="forgotLoading" class="flex items-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Menyimpan Password...</span>
                    </span>
                    <span v-else class="flex items-center gap-2">
                      <span>Simpan & Perbarui Kata Sandi</span>
                      <span class="material-symbols-outlined text-[18px]">check</span>
                    </span>
                  </button>
                </form>
              </div>

              <!-- ── STEP 4: Sukses ── -->
              <div v-else-if="forgotStep === 4" class="text-center py-4 space-y-4">
                <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <span class="material-symbols-outlined text-[36px]">check_circle</span>
                </div>

                <div class="space-y-1">
                  <h4 class="text-lg font-bold text-slate-900">Kata Sandi Berhasil Direset!</h4>
                  <p class="text-xs sm:text-sm text-slate-600">
                    Kata sandi akun Anda telah diperbarui. Silakan masuk kembali dengan kata sandi baru Anda.
                  </p>
                </div>

                <button
                  type="button"
                  @click="finishResetAndLogin"
                  class="w-full h-11 mt-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Masuk ke Akun Anda</span>
                  <span class="material-symbols-outlined text-[18px]">login</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-scale-up {
  animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
