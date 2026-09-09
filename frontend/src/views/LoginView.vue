<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Laptop, Ticket, BookOpen, CircleAlert, Mail, LockKeyhole, Eye, EyeOff, LoaderCircle } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { findFirstAllowedRoute } from '@/utils/permissionAccess.js'
import { allowedRouteMap } from '@/router/index.js'

const router = useRouter()
const { login, user } = useAuth()
const { post } = useApi()

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
  if (window.matchMedia('(min-width: 768px) and (pointer: fine)').matches) emailInput.value?.focus()
})
onUnmounted(() => {
  clearInterval(resendInterval)
  clearInterval(expiryInterval)
})

const EMAIL_FORMAT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Email dan kata sandi wajib diisi.'
    return
  }

  if (!EMAIL_FORMAT_PATTERN.test(email.value.trim())) {
    errorMessage.value = 'Format email tidak valid.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await login(email.value, password.value, rememberMe.value)

    const redirectPath = router.currentRoute.value.query.redirect
    if (redirectPath) {
      router.push(redirectPath)
    } else {
      const firstAllowed = findFirstAllowedRoute(user.value, allowedRouteMap)
      router.push({ name: firstAllowed?.name || 'dashboard' })
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
  <div class="login-page">
    <header class="login-header">
      <RouterLink to="/" class="login-brand" aria-label="ESB TrackIT — Pusat Bantuan">
        <img src="/ESB Logo Only.svg" alt="" width="36" height="28" />
        <span>TrackIT</span>
      </RouterLink>
      <RouterLink to="/" class="back-help"><ArrowLeft :size="16" aria-hidden="true" /><span>Pusat Bantuan</span></RouterLink>
    </header>
    <main class="login-main">
      <aside class="login-story" aria-labelledby="story-title">
        <div class="story-top"><span class="story-mark"></span>ESB PEOPLE TECHNOLOGY</div>
        <div class="story-content">
          <span class="story-eyebrow">RUANG KERJA ANDA</span>
          <h2 id="story-title">Aset terkelola.<br />Kerja lebih mudah.</h2>
          <p>Akses inventaris perangkat dan bantuan tim support dalam satu tempat.</p>
          <div class="story-features">
            <div><span class="feature-icon"><Laptop :size="21" aria-hidden="true" /></span><span><strong>Aset & perangkat</strong><small>Lihat inventaris dan penempatan aset.</small></span></div>
            <div><span class="feature-icon"><Ticket :size="21" aria-hidden="true" /></span><span><strong>Tiket bantuan</strong><small>Ajukan kendala dan pantau penanganannya.</small></span></div>
            <div><span class="feature-icon"><BookOpen :size="21" aria-hidden="true" /></span><span><strong>Panduan kerja</strong><small>Temukan artikel dan solusi di Help Center.</small></span></div>
          </div>
        </div>
        <div class="story-footer">ESB TrackIT <span>Helpdesk & Asset Management</span></div>
      </aside>
      <section class="login-form-panel" aria-labelledby="login-title">
        <div class="login-form-inner">
          <span class="login-eyebrow">MASUK KE TRACKIT</span>
          <h1 id="login-title">Selamat datang kembali.</h1>
          <p class="login-intro">Gunakan email akun Anda untuk melanjutkan.</p>
          <div v-if="errorMessage" id="login-error" class="login-error" role="alert"><CircleAlert :size="18" aria-hidden="true" /><span>{{ errorMessage }}</span></div>
          <form class="login-form" :aria-busy="isLoading" @submit.prevent="handleLogin">
            <div class="login-field">
              <label for="email">Alamat email</label>
              <div class="input-wrap"><Mail :size="18" aria-hidden="true" /><input id="email" ref="emailInput" v-model="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="nama@esb.co.id" required :disabled="isLoading" :aria-describedby="errorMessage ? 'login-error' : undefined" /></div>
            </div>
            <div class="login-field">
              <label for="password">Kata sandi</label>
              <div class="input-wrap"><LockKeyhole :size="18" aria-hidden="true" /><input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Masukkan kata sandi" required :disabled="isLoading" :aria-describedby="errorMessage ? 'login-error' : undefined" /><button type="button" class="password-toggle" :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" :aria-pressed="showPassword" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></div>
            </div>
            <div class="login-options"><label><input v-model="rememberMe" type="checkbox" :disabled="isLoading" /><span>Ingat saya</span></label><button type="button" :disabled="isLoading" @click="openForgotModal">Lupa kata sandi?</button></div>
            <button type="submit" class="login-submit" :disabled="isLoading"><LoaderCircle v-if="isLoading" :size="18" class="login-spinner" aria-hidden="true" /><span>{{ isLoading ? 'Sedang masuk…' : 'Masuk' }}</span><ArrowRight v-if="!isLoading" :size="18" aria-hidden="true" /></button>
          </form>
          <div class="activation-note"><span>Belum mengaktifkan akun?</span><button type="button" @click="openForgotModal">Aktivasi akun<ArrowRight :size="14" aria-hidden="true" /></button></div>
        </div>
        <p class="form-help">Butuh panduan? <RouterLink to="/">Kunjungi Pusat Bantuan</RouterLink></p>
      </section>
    </main>
    <footer class="login-footer">&copy; {{ new Date().getFullYear() }} ESB People Technology</footer>
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showForgotModal"
          class="login-reset fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm select-none"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-modal-title"
            class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up max-h-[92dvh] sm:max-h-[88vh] flex flex-col"
            @click.stop
          >
            <!-- Modal Header -->
            <div
              class="px-4 sm:px-6 pt-5 sm:pt-6 pb-3.5 sm:pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0"
            >
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold shrink-0"
                >
                  <span class="material-symbols-outlined text-[18px] sm:text-[20px]"
                    >lock_reset</span
                  >
                </div>
                <div>
                  <h3
                    id="forgot-modal-title"
                    class="text-sm sm:text-base font-bold text-slate-900 leading-snug"
                  >
                    Reset Kata Sandi
                  </h3>
                  <p class="text-[11px] sm:text-xs text-slate-500">
                    Verifikasi email dengan kode OTP
                  </p>
                </div>
              </div>
              <button
                @click="closeForgotModal"
                class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
                aria-label="Tutup"
              >
                <span class="material-symbols-outlined text-[18px] sm:text-[20px]">close</span>
              </button>
            </div>

            <!-- Stepper Progress Dots -->
            <div
              class="px-4 sm:px-6 pt-3.5 pb-2 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0"
            >
              <div
                class="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold"
                :class="forgotStep >= 1 ? 'text-[#2563EB]' : 'text-slate-400'"
              >
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  :class="
                    forgotStep >= 1 ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'
                  "
                  >1</span
                >
                <span class="truncate max-w-[60px] sm:max-w-none">Email</span>
              </div>
              <div
                class="flex-1 max-w-[20px] sm:max-w-[28px] h-0.5 bg-slate-200 shrink-0"
                :class="{ 'bg-[#2563EB]': forgotStep >= 2 }"
              ></div>
              <div
                class="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold"
                :class="forgotStep >= 2 ? 'text-[#2563EB]' : 'text-slate-400'"
              >
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  :class="
                    forgotStep >= 2 ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'
                  "
                  >2</span
                >
                <span class="truncate max-w-[60px] sm:max-w-none"
                  ><span class="sm:hidden">OTP</span
                  ><span class="hidden sm:inline">Kode OTP</span></span
                >
              </div>
              <div
                class="flex-1 max-w-[20px] sm:max-w-[28px] h-0.5 bg-slate-200 shrink-0"
                :class="{ 'bg-[#2563EB]': forgotStep >= 3 }"
              ></div>
              <div
                class="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold"
                :class="forgotStep >= 3 ? 'text-[#2563EB]' : 'text-slate-400'"
              >
                <span
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  :class="
                    forgotStep >= 3 ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-500'
                  "
                  >3</span
                >
                <span class="truncate max-w-[70px] sm:max-w-none"
                  ><span class="sm:hidden">Sandi</span
                  ><span class="hidden sm:inline">Password Baru</span></span
                >
              </div>
            </div>

            <!-- Modal Body Content -->
            <div class="p-4 sm:p-6 overflow-y-auto flex-1">
              <!-- Error Alert in Modal -->
              <div
                v-if="forgotError"
                class="mb-3.5 sm:mb-4 rounded-xl bg-red-50 p-3 border border-red-200 flex items-start gap-2.5"
                role="alert"
              >
                <span class="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5"
                  >error</span
                >
                <p class="text-xs font-semibold text-red-800 leading-snug">{{ forgotError }}</p>
              </div>

              <!-- Success Alert in Modal -->
              <div
                v-if="forgotSuccessMsg && forgotStep !== 4"
                class="mb-3.5 sm:mb-4 rounded-xl bg-emerald-50 p-3 border border-emerald-200 flex items-start gap-2.5"
                role="alert"
              >
                <span class="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5"
                  >check_circle</span
                >
                <p class="text-xs font-semibold text-emerald-800 leading-snug">
                  {{ forgotSuccessMsg }}
                </p>
              </div>

              <!-- ── STEP 1: Masukkan Email ── -->
              <div v-if="forgotStep === 1" class="space-y-4">
                <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Masukkan alamat email akun Anda. Kami akan mengirimkan
                  <strong>6 digit kode verifikasi (OTP)</strong> yang berlaku selama
                  <strong>5 menit</strong>.
                </p>

                <form @submit.prevent="handleRequestOtp" class="space-y-3.5 sm:space-y-4">
                  <div class="space-y-1.5">
                    <label for="forgot-email" class="block text-xs font-bold text-slate-800">
                      Alamat Email Terdaftar
                    </label>
                    <div class="relative">
                      <span
                        class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center"
                      >
                        <span class="material-symbols-outlined text-[18px]">mail</span>
                      </span>
                      <input
                        id="forgot-email"
                        v-model="forgotEmail"
                        type="email"
                        required
                        placeholder="nama@esb.co.id"
                        class="h-11 sm:h-12 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    :disabled="forgotLoading"
                    class="w-full h-11 sm:h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.98] touch-manipulation"
                  >
                    <span v-if="forgotLoading" class="flex items-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-[18px]"
                        >progress_activity</span
                      >
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
              <div v-else-if="forgotStep === 2" class="space-y-4 sm:space-y-5">
                <div class="text-center">
                  <p class="text-xs sm:text-sm text-slate-600">
                    Kode verifikasi telah dikirimkan ke:
                  </p>
                  <p class="text-sm font-bold text-slate-900 mt-0.5 break-all">
                    {{ forgotEmail }}
                  </p>
                  <div
                    class="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"
                  >
                    <span class="material-symbols-outlined text-[14px]">timer</span>
                    <span>Berlaku: {{ formatTimer(otpExpirySeconds) }}</span>
                  </div>
                </div>

                <!-- 6-digit OTP Input Boxes -->
                <div class="space-y-2">
                  <label class="block text-center text-xs font-bold text-slate-700">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <div
                    class="flex justify-center gap-1.5 sm:gap-2.5 max-w-full overflow-x-auto py-1"
                    @paste="handleOtpPaste"
                  >
                    <input
                      v-for="(digit, idx) in otpDigits"
                      :key="idx"
                      :ref="(el) => (otpInputRefs[idx] = el)"
                      v-model="otpDigits[idx]"
                      type="text"
                      inputmode="numeric"
                      autocomplete="one-time-code"
                      :aria-label="`Digit OTP ${idx + 1}`"
                      maxlength="1"
                      class="w-9 h-11 sm:w-11 sm:h-12 text-center text-lg sm:text-xl font-bold rounded-lg sm:rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10 transition-all shrink-0"
                      @input="handleOtpInput(idx, $event)"
                      @keydown="handleOtpKeyDown(idx, $event)"
                    />
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="space-y-3 pt-1">
                  <button
                    type="button"
                    :disabled="
                      forgotLoading || otpDigits.join('').length !== 6 || otpExpirySeconds <= 0
                    "
                    @click="handleVerifyOtp"
                    class="w-full h-11 sm:h-12 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98] touch-manipulation"
                  >
                    <span v-if="forgotLoading" class="flex items-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-[18px]"
                        >progress_activity</span
                      >
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
                      class="text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer py-1 touch-manipulation"
                    >
                      &larr; Ganti Email
                    </button>

                    <button
                      type="button"
                      :disabled="resendCooldown > 0 || forgotLoading"
                      @click="handleResendOtp"
                      class="font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer transition-colors py-1 touch-manipulation"
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
                      <span
                        class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center"
                      >
                        <span class="material-symbols-outlined text-[18px]">lock</span>
                      </span>
                      <input
                        id="new-password"
                        v-model="forgotNewPassword"
                        :type="showNewPassword ? 'text' : 'password'"
                        required
                        placeholder="Minimal 8 karakter"
                        class="h-11 sm:h-12 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-11 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                      <button
                        type="button"
                        @click="showNewPassword = !showNewPassword"
                        class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer touch-manipulation"
                        :aria-label="showNewPassword ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'"
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
                      <span
                        class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center"
                      >
                        <span class="material-symbols-outlined text-[18px]">lock_clock</span>
                      </span>
                      <input
                        id="confirm-password"
                        v-model="forgotConfirmPassword"
                        :type="showConfirmPassword ? 'text' : 'password'"
                        required
                        placeholder="Ketik ulang kata sandi baru"
                        class="h-11 sm:h-12 w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-11 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
                      />
                      <button
                        type="button"
                        @click="showConfirmPassword = !showConfirmPassword"
                        class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer touch-manipulation"
                        tabindex="-1"
                      >
                        <span class="material-symbols-outlined text-[18px] block">
                          {{ showConfirmPassword ? 'visibility_off' : 'visibility' }}
                        </span>
                      </button>
                    </div>
                  </div>

                  <!-- Requirements helper -->
                  <div
                    class="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs space-y-1 text-slate-600"
                  >
                    <div
                      class="flex items-center gap-1.5"
                      :class="
                        forgotNewPassword.length >= 8
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-500'
                      "
                    >
                      <span class="material-symbols-outlined text-[15px]">{{
                        forgotNewPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked'
                      }}</span>
                      <span>Minimal 8 karakter</span>
                    </div>
                    <div
                      class="flex items-center gap-1.5"
                      :class="
                        forgotNewPassword && forgotNewPassword === forgotConfirmPassword
                          ? 'text-emerald-600 font-semibold'
                          : 'text-slate-500'
                      "
                    >
                      <span class="material-symbols-outlined text-[15px]">{{
                        forgotNewPassword && forgotNewPassword === forgotConfirmPassword
                          ? 'check_circle'
                          : 'radio_button_unchecked'
                      }}</span>
                      <span>Kata sandi cocok</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    :disabled="
                      forgotLoading ||
                      forgotNewPassword.length < 8 ||
                      forgotNewPassword !== forgotConfirmPassword
                    "
                    class="w-full h-11 sm:h-12 mt-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98] touch-manipulation"
                  >
                    <span v-if="forgotLoading" class="flex items-center gap-2">
                      <span class="material-symbols-outlined animate-spin text-[18px]"
                        >progress_activity</span
                      >
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
                <div
                  class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center"
                >
                  <span class="material-symbols-outlined text-[32px] sm:text-[36px]"
                    >check_circle</span
                  >
                </div>

                <div class="space-y-1">
                  <h4 class="text-base sm:text-lg font-bold text-slate-900">
                    Kata Sandi Berhasil Direset!
                  </h4>
                  <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Kata sandi akun Anda telah diperbarui. Silakan masuk kembali dengan kata sandi
                    baru Anda.
                  </p>
                </div>

                <button
                  type="button"
                  @click="finishResetAndLogin"
                  class="w-full h-11 sm:h-12 mt-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] touch-manipulation"
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
