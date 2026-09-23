/**
 * design-system.js — kontrak UI terpusat (Fase 6–9 implementasi).
 *
 * Sumber token visual tetap design-tokens/*.json → scripts/build-tokens.js
 * → src/styles/tokens.css. File ini adalah lapisan komponen: motion
 * language, pemetaan status, dan palet tone yang dipakai komponen UI.
 * Selaras dengan referensi Transitions.dev/DesignSpells: durasi
 * interaksi 100–250ms, easing konsisten, reduced-motion dihormati.
 */

/** Motion language — selaras design-tokens/motion.json */
export const MOTION = {
  fast: { duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  normal: { duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  slow: { duration: 400, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
}

/** Tone semantik tunggal (kontras AA, dipakai StatusBadge & Alert) */
export const STATE_TONES = {
  success: { chip: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]', dot: 'bg-[#059669]', text: 'text-[#047857]' },
  warning: { chip: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]', dot: 'bg-[#D97706]', text: 'text-[#B45309]' },
  danger: { chip: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]', dot: 'bg-[#DC2626]', text: 'text-[#B91C1C]' },
  info: { chip: 'bg-[#EDF5FF] text-[#1E40AF] border-[#BFDBFE]', dot: 'bg-[#0A51B0]', text: 'text-[#1E40AF]' },
  neutral: { chip: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]', dot: 'bg-[#64748B]', text: 'text-[#475569]' },
  cyan: { chip: 'bg-[#E0F2FE] text-[#0369A1] border-[#7DD3FC]', dot: 'bg-[#0284C7]', text: 'text-[#0369A1]' },
  purple: { chip: 'bg-[#EDE9FE] text-[#6D28D9] border-[#C4B5FD]', dot: 'bg-[#7C3AED]', text: 'text-[#6D28D9]' },
}

/** Pemetaan status API → tone. Dipakai StatusBadge.vue. */
export const STATUS_TONE_MAP = [
  ['open', 'info'],
  ['in progress', 'info'],
  ['pending', 'warning'],
  ['resolved', 'success'],
  ['closed', 'neutral'],
  ['cancelled', 'neutral'],
  ['canceled', 'neutral'],
  ['claimed', 'cyan'],
  ['urgent', 'danger'],
  ['critical', 'danger'],
  ['high', 'warning'],
  ['medium', 'warning'],
  ['low', 'success'],
  ['in use', 'info'],
  ['digunakan', 'info'],
  ['stock', 'success'],
  ['tersedia', 'success'],
  ['damaged', 'danger'],
  ['rusak', 'danger'],
  ['in service', 'warning'],
  ['perawatan', 'warning'],
  ['disposal', 'neutral'],
  ['draft', 'neutral'],
  ['submitted', 'info'],
  ['completed', 'success'],
  ['selesai', 'success'],
  ['belum', 'warning'],
  ['dikirim', 'info'],
  ['diterima', 'success'],
  ['transit', 'cyan'],
]

export function resolveStatusTone(status) {
  if (!status) return 'neutral'
  const s = String(status).toLowerCase().replace(/[_-]/g, ' ')
  const hit = STATUS_TONE_MAP.find(([key]) => s.includes(key))
  return hit ? hit[1] : 'neutral'
}
