export function useChartTheme() {
  // Palet brand — satu sumber warna untuk semua chart.
  // Gelap → terang agar urutan dataset terasa berjenjang.
  const chartColors = {
    primary: '#0A51B0',
    primaryLight: 'rgba(10, 81, 176, 0.14)',
    primarySoft: 'rgba(10, 81, 176, 0.08)',
    secondary: '#097CDE',
    success: '#0E9F6E',
    successLight: 'rgba(14, 159, 110, 0.14)',
    warning: '#D97706',
    warningLight: 'rgba(217, 119, 6, 0.14)',
    danger: '#DC2626',
    dangerLight: 'rgba(220, 38, 38, 0.12)',
    brandPrimary: '#FF4F1B',
    purple: '#7C3AED',
    gray: '#94A3B8',
    darkText: '#1E293B',
    mutedText: '#5B6B84',
    gridLine: 'rgba(148, 163, 184, 0.22)',
    background: '#F8FAFC',
    border: '#E2E8F0',
  }

  const palette = [
    '#0A51B0',
    '#097CDE',
    '#0E9F6E',
    '#D97706',
    '#7C3AED',
    '#DC2626',
    '#0E7490',
    '#64748B',
  ]

  const fontStack = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false, axis: 'x' },
    animations: { colors: true, x: { type: 'number', easing: 'easeOutQuart' } },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: chartColors.darkText,
          font: { family: fontStack, size: 11, weight: '600' },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        // Tooltip gelap dengan aksen brand agar hover terasa "hidup".
        backgroundColor: '#0F172A',
        titleColor: '#FFFFFF',
        bodyColor: '#E2E8F0',
        borderColor: 'rgba(9, 124, 222, 0.45)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        displayColors: true,
        usePointStyle: true,
        titleFont: { family: fontStack, size: 12, weight: '700' },
        bodyFont: { family: fontStack, size: 12 },
      },
    },
  }

  return {
    chartColors,
    palette,
    fontStack,
    commonOptions,
  }
}
