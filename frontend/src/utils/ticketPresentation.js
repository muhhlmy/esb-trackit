const STATUS_STYLES = {
  open: [
    'bg-emerald-500',
    'text-emerald-700 font-semibold',
    'bg-emerald-50/90 text-emerald-700 border-emerald-200/80',
    'Open',
  ],
  'in progress': [
    'bg-blue-500',
    'text-blue-700 font-semibold',
    'bg-blue-50/90 text-blue-700 border-blue-200/80',
    'In Progress',
  ],
  pending: [
    'bg-amber-500',
    'text-amber-700 font-semibold',
    'bg-amber-50/90 text-amber-700 border-amber-200/80',
    'Pending',
  ],
  resolved: [
    'bg-teal-500',
    'text-teal-700 font-semibold',
    'bg-teal-50/90 text-teal-700 border-teal-200/80',
    'Resolved',
  ],
  closed: [
    'bg-slate-400',
    'text-slate-600 font-medium',
    'bg-slate-100 text-slate-600 border-slate-200/80',
    'Closed',
  ],
  cancelled: [
    'bg-rose-500',
    'text-rose-600 font-medium',
    'bg-rose-50/90 text-rose-700 border-rose-200/80',
    'Cancelled',
  ],
}

export function getStatusDotInfo(status) {
  const s = (status || '').toLowerCase()
  const [dotClass, textClass, badgeClass, label] = STATUS_STYLES[s] || STATUS_STYLES.closed
  return { dotClass, textClass, badgeClass, label: s in STATUS_STYLES ? label : status || label }
}

const PRIORITY_STYLES = {
  critical: ['Critical', 'text-rose-700 font-bold bg-rose-50 border-rose-200/80', 'warning'],
  high: ['High', 'text-amber-800 font-semibold bg-amber-50 border-amber-200/80', 'priority_high'],
  medium: ['Medium', 'text-slate-700 font-medium bg-slate-100/90 border-slate-200/80', 'remove'],
  low: ['Low', 'text-slate-600 font-medium bg-slate-50 border-slate-200/60', 'arrow_downward'],
}

const PRIORITY_KEYS = [
  [['critical', 'urgent'], 'critical'],
  [['high'], 'high'],
  [['medium'], 'medium'],
]

export function getPriorityInfo(prioritas) {
  const p = (prioritas || '').toLowerCase()
  const key = (PRIORITY_KEYS.find(([keys]) => keys.some((k) => p.includes(k))) || [null, 'low'])[1]
  const [label, className, icon] = PRIORITY_STYLES[key]
  return { label, class: className, icon }
}
