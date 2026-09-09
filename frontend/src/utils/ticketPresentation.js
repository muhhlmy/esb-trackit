export function getStatusDotInfo(status) {
  const s = (status || '').toLowerCase()
  if (s === 'open')
    return {
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-700 font-semibold',
      badgeClass: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80',
      label: 'Open',
    }
  if (s === 'in progress')
    return {
      dotClass: 'bg-blue-500',
      textClass: 'text-blue-700 font-semibold',
      badgeClass: 'bg-blue-50/90 text-blue-700 border-blue-200/80',
      label: 'In Progress',
    }
  if (s === 'pending')
    return {
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700 font-semibold',
      badgeClass: 'bg-amber-50/90 text-amber-700 border-amber-200/80',
      label: 'Pending',
    }
  if (s === 'resolved')
    return {
      dotClass: 'bg-teal-500',
      textClass: 'text-teal-700 font-semibold',
      badgeClass: 'bg-teal-50/90 text-teal-700 border-teal-200/80',
      label: 'Resolved',
    }
  if (s === 'closed')
    return {
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-600 font-medium',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
      label: 'Closed',
    }
  if (s === 'cancelled')
    return {
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-600 font-medium',
      badgeClass: 'bg-rose-50/90 text-rose-700 border-rose-200/80',
      label: 'Cancelled',
    }
  return {
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-600 font-medium',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
    label: status || 'Open',
  }
}

export function getPriorityInfo(prioritas) {
  const p = (prioritas || '').toLowerCase()
  if (p.includes('critical') || p.includes('urgent')) {
    return {
      label: 'Critical',
      class: 'text-rose-700 font-bold bg-rose-50 border-rose-200/80',
      icon: 'warning',
    }
  }
  if (p.includes('high')) {
    return {
      label: 'High',
      class: 'text-amber-800 font-semibold bg-amber-50 border-amber-200/80',
      icon: 'priority_high',
    }
  }
  if (p.includes('medium')) {
    return {
      label: 'Medium',
      class: 'text-slate-700 font-medium bg-slate-100/90 border-slate-200/80',
      icon: 'remove',
    }
  }
  return {
    label: 'Low',
    class: 'text-slate-600 font-medium bg-slate-50 border-slate-200/60',
    icon: 'arrow_downward',
  }
}
