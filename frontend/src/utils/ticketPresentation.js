/**
 * Presentation helpers untuk tiket — konsolidasi ke sistem tone sentral
 * (config/design-system.js) sehingga semua badge/priority di aplikasi
 * memakai palet semantik yang sama.
 */
import { STATE_TONES, resolveStatusTone } from '../config/design-system.js'

/** Title-case label: 'in progress' → 'In Progress' */
function humanize(value) {
  const s = String(value || '').replace(/[_-]+/g, ' ').trim()
  return s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Closed'
}

export function getStatusDotInfo(status) {
  const tone = STATE_TONES[resolveStatusTone(status)]
  return { dotClass: tone.dot, badgeClass: tone.chip, textClass: tone.text, label: humanize(status) }
}

const PRIORITY_ICONS = { danger: 'warning', warning: 'priority_high', success: 'arrow_downward', neutral: 'remove' }

const PRIORITY_KEYS = [
  [['critical', 'urgent'], 'danger'],
  [['high'], 'warning'],
  [['medium'], 'neutral'],
  [['low'], 'neutral'],
]

export function getPriorityInfo(prioritas) {
  const p = (prioritas || '').toLowerCase()
  const hit = PRIORITY_KEYS.find(([keys]) => keys.some((k) => p.includes(k)))
  const toneKey = hit ? hit[1] : 'neutral'
  const tone = STATE_TONES[toneKey]
  return { label: humanize(prioritas || 'Low'), class: tone.chip, icon: PRIORITY_ICONS[toneKey] }
}
