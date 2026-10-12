// ============================================================================
// assetDepreciationService.js - Financial Lifecycle & Asset Depreciation Engine
// Supports Straight-Line (Garis Lurus) and Double-Declining Balance (Saldo Menurun)
// Standard enterprise asset lifecycle calculations with zero external bloat.
// ============================================================================

export const DEPRECIATION_METHODS = Object.freeze({
  STRAIGHT_LINE: 'straight_line',
  DOUBLE_DECLINING: 'double_declining',
})

export const DEFAULT_LIFECYCLE_RULES = Object.freeze({
  laptop: { usefulLifeMonths: 48, salvagePercent: 10 },
  desktop: { usefulLifeMonths: 48, salvagePercent: 10 },
  server: { usefulLifeMonths: 60, salvagePercent: 10 },
  monitor: { usefulLifeMonths: 36, salvagePercent: 5 },
  smartphone: { usefulLifeMonths: 36, salvagePercent: 10 },
  tablet: { usefulLifeMonths: 36, salvagePercent: 10 },
  printer: { usefulLifeMonths: 36, salvagePercent: 5 },
  networking: { usefulLifeMonths: 60, salvagePercent: 10 },
  ac: { usefulLifeMonths: 60, salvagePercent: 10 },
  meja: { usefulLifeMonths: 96, salvagePercent: 5 },
  kursi: { usefulLifeMonths: 60, salvagePercent: 5 },
  kendaraan: { usefulLifeMonths: 96, salvagePercent: 15 },
  default: { usefulLifeMonths: 48, salvagePercent: 10 },
})

/**
 * Resolves lifecycle rules based on device type or category.
 */
export function resolveLifecycleRule(deviceType) {
  if (!deviceType || typeof deviceType !== 'string') {
    return DEFAULT_LIFECYCLE_RULES.default
  }
  const normalized = deviceType.trim().toLowerCase()
  for (const [key, rule] of Object.entries(DEFAULT_LIFECYCLE_RULES)) {
    if (key !== 'default' && normalized.includes(key)) {
      return rule
    }
  }
  return DEFAULT_LIFECYCLE_RULES.default
}

function calculateElapsedMonths(startDate, endDate = new Date()) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0
  }
  if (end < start) return 0

  const yearsDiff = end.getFullYear() - start.getFullYear()
  const monthsDiff = end.getMonth() - start.getMonth()
  const totalMonths = yearsDiff * 12 + monthsDiff

  // Check day of month to add fractional or floor precision
  return Math.max(0, totalMonths)
}

function roundCurrency(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100
}

/**
 * Calculates straight-line depreciation for an asset.
 */
export function calculateStraightLineDepreciation({
  cost,
  salvageValue,
  usefulLifeMonths,
  acquisitionDate,
  asOfDate = new Date(),
}) {
  const numericCost = Math.max(0, Number(cost) || 0)
  const numericUsefulLife = Math.max(1, Number(usefulLifeMonths) || 1)
  const numericSalvage = Math.min(numericCost, Math.max(0, Number(salvageValue) || 0))

  const depreciableAmount = Math.max(0, numericCost - numericSalvage)
  const monthlyDepreciation = roundCurrency(depreciableAmount / numericUsefulLife)
  const elapsedMonths = calculateElapsedMonths(acquisitionDate, asOfDate)
  const effectiveMonths = Math.min(elapsedMonths, numericUsefulLife)

  const accumulatedDepreciation = roundCurrency(
    Math.min(depreciableAmount, monthlyDepreciation * effectiveMonths),
  )
  const currentBookValue = roundCurrency(numericCost - accumulatedDepreciation)
  const remainingMonths = Math.max(0, numericUsefulLife - elapsedMonths)

  let status = 'Active'
  if (numericCost === 0 || elapsedMonths >= numericUsefulLife) {
    status = 'Fully Depreciated'
  } else if (depreciableAmount > 0 && accumulatedDepreciation >= depreciableAmount * 0.9) {
    status = 'Near End of Life'
  }

  return {
    method: DEPRECIATION_METHODS.STRAIGHT_LINE,
    acquisitionCost: numericCost,
    salvageValue: numericSalvage,
    depreciableAmount,
    usefulLifeMonths: numericUsefulLife,
    elapsedMonths,
    remainingMonths,
    monthlyDepreciation,
    accumulatedDepreciation,
    currentBookValue,
    depreciationPercentage: depreciableAmount > 0
      ? roundCurrency((accumulatedDepreciation / depreciableAmount) * 100)
      : 100,
    status,
  }
}

/**
 * Calculates double-declining balance depreciation for an asset.
 */
export function calculateDoubleDecliningDepreciation({
  cost,
  salvageValue,
  usefulLifeMonths,
  acquisitionDate,
  asOfDate = new Date(),
}) {
  const numericCost = Math.max(0, Number(cost) || 0)
  const numericUsefulLife = Math.max(1, Number(usefulLifeMonths) || 1)
  const numericSalvage = Math.min(numericCost, Math.max(0, Number(salvageValue) || 0))

  const elapsedMonths = calculateElapsedMonths(acquisitionDate, asOfDate)
  const annualRate = 2 / (numericUsefulLife / 12)
  const monthlyRate = annualRate / 12

  let bookValue = numericCost
  let accumulated = 0

  for (let m = 1; m <= elapsedMonths; m++) {
    if (bookValue <= numericSalvage) {
      bookValue = numericSalvage
      accumulated = numericCost - numericSalvage
      break
    }
    const currentDepr = roundCurrency(bookValue * monthlyRate)
    if (bookValue - currentDepr < numericSalvage) {
      accumulated = numericCost - numericSalvage
      bookValue = numericSalvage
      break
    }
    accumulated += currentDepr
    bookValue -= currentDepr
  }

  accumulated = roundCurrency(accumulated)
  bookValue = roundCurrency(bookValue)
  const remainingMonths = Math.max(0, numericUsefulLife - elapsedMonths)

  let status = 'Active'
  if (numericCost === 0 || bookValue <= numericSalvage || elapsedMonths >= numericUsefulLife) {
    status = 'Fully Depreciated'
  } else if (numericCost > numericSalvage && bookValue - numericSalvage <= (numericCost - numericSalvage) * 0.1) {
    status = 'Near End of Life'
  }

  return {
    method: DEPRECIATION_METHODS.DOUBLE_DECLINING,
    acquisitionCost: numericCost,
    salvageValue: numericSalvage,
    usefulLifeMonths: numericUsefulLife,
    elapsedMonths,
    remainingMonths,
    accumulatedDepreciation: accumulated,
    currentBookValue: bookValue,
    depreciationPercentage: numericCost > numericSalvage
      ? roundCurrency((accumulated / (numericCost - numericSalvage)) * 100)
      : 100,
    status,
  }
}

/**
 * Generates an amortized monthly ledger schedule across the asset's useful life.
 */
export function generateDepreciationSchedule({
  cost,
  salvageValue,
  usefulLifeMonths,
  acquisitionDate,
  method = DEPRECIATION_METHODS.STRAIGHT_LINE,
}) {
  const numericCost = Math.max(0, Number(cost) || 0)
  const numericUsefulLife = Math.max(1, Number(usefulLifeMonths) || 1)
  const numericSalvage = Math.min(numericCost, Math.max(0, Number(salvageValue) || 0))
  const startDate = new Date(acquisitionDate || new Date())

  const schedule = []
  let bookValue = numericCost
  let totalAccumulated = 0

  const depreciableAmount = numericCost - numericSalvage
  const monthlyStraightLine = roundCurrency(depreciableAmount / numericUsefulLife)
  const monthlyDoubleDecliningRate = (2 / (numericUsefulLife / 12)) / 12

  for (let month = 1; month <= numericUsefulLife; month++) {
    const periodDate = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1)
    let depreciationForPeriod = 0

    if (method === DEPRECIATION_METHODS.DOUBLE_DECLINING) {
      depreciationForPeriod = roundCurrency(bookValue * monthlyDoubleDecliningRate)
      if (bookValue - depreciationForPeriod < numericSalvage) {
        depreciationForPeriod = roundCurrency(bookValue - numericSalvage)
      }
    } else {
      depreciationForPeriod = (month === numericUsefulLife)
        ? roundCurrency(depreciableAmount - totalAccumulated)
        : monthlyStraightLine
    }

    depreciationForPeriod = Math.max(0, depreciationForPeriod)
    totalAccumulated = roundCurrency(totalAccumulated + depreciationForPeriod)
    bookValue = roundCurrency(Math.max(numericSalvage, numericCost - totalAccumulated))

    schedule.push({
      periodMonth: month,
      periodDate: periodDate.toISOString().slice(0, 7),
      depreciationExpense: depreciationForPeriod,
      accumulatedDepreciation: totalAccumulated,
      endingBookValue: bookValue,
    })

    if (bookValue <= numericSalvage) break
  }

  return schedule
}
