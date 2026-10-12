import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateStraightLineDepreciation,
  calculateDoubleDecliningDepreciation,
  generateDepreciationSchedule,
  resolveLifecycleRule,
  DEPRECIATION_METHODS,
} from '../src/services/assetDepreciationService.js'

test('Asset Financial Lifecycle & Depreciation Service Suite', async (t) => {
  await t.test('1. resolveLifecycleRule identifies device categories accurately', () => {
    assert.equal(resolveLifecycleRule('MacBook Pro Laptop').usefulLifeMonths, 48)
    assert.equal(resolveLifecycleRule('Dell PowerEdge Server').usefulLifeMonths, 60)
    assert.equal(resolveLifecycleRule('LG UltraWide Monitor').usefulLifeMonths, 36)
    assert.equal(resolveLifecycleRule('Meja Kerja Kantor').usefulLifeMonths, 96)
    assert.equal(resolveLifecycleRule('Unknown Gadget').usefulLifeMonths, 48)
  })

  await t.test('2. calculateStraightLineDepreciation computes monthly depreciation and book value correctly', () => {
    const cost = 24_000_000 // Rp 24,000,000
    const salvageValue = 2_400_000 // 10% salvage = Rp 2,400,000
    const usefulLifeMonths = 48
    // Acquisition 24 months ago
    const now = new Date()
    const acquisitionDate = new Date(now.getFullYear(), now.getMonth() - 24, 1)

    const result = calculateStraightLineDepreciation({
      cost,
      salvageValue,
      usefulLifeMonths,
      acquisitionDate,
      asOfDate: now,
    })

    assert.equal(result.method, DEPRECIATION_METHODS.STRAIGHT_LINE)
    assert.equal(result.acquisitionCost, cost)
    assert.equal(result.salvageValue, salvageValue)
    assert.equal(result.depreciableAmount, 21_600_000)
    assert.equal(result.monthlyDepreciation, 450_000) // 21,600,000 / 48 = 450,000 per month
    assert.equal(result.elapsedMonths, 24)
    assert.equal(result.remainingMonths, 24)
    assert.equal(result.accumulatedDepreciation, 10_800_000) // 450,000 * 24
    assert.equal(result.currentBookValue, 13_200_000) // 24,000,000 - 10,800,000
    assert.equal(result.depreciationPercentage, 50)
    assert.equal(result.status, 'Active')
  })

  await t.test('3. calculateStraightLineDepreciation flags fully depreciated assets at lifespan completion', () => {
    const cost = 10_000_000
    const salvageValue = 1_000_000
    const usefulLifeMonths = 36
    // Acquisition 40 months ago (past lifespan)
    const now = new Date()
    const acquisitionDate = new Date(now.getFullYear(), now.getMonth() - 40, 1)

    const result = calculateStraightLineDepreciation({
      cost,
      salvageValue,
      usefulLifeMonths,
      acquisitionDate,
      asOfDate: now,
    })

    assert.equal(result.elapsedMonths, 40)
    assert.equal(result.remainingMonths, 0)
    assert.equal(result.accumulatedDepreciation, 9_000_000) // Capped at depreciable amount
    assert.equal(result.currentBookValue, 1_000_000) // Remains at salvage value
    assert.equal(result.status, 'Fully Depreciated')
    assert.equal(result.depreciationPercentage, 100)
  })

  await t.test('4. calculateDoubleDecliningDepreciation accelerates initial depreciation', () => {
    const cost = 20_000_000
    const salvageValue = 2_000_000
    const usefulLifeMonths = 48
    const now = new Date()
    const acquisitionDate = new Date(now.getFullYear(), now.getMonth() - 12, 1)

    const ddb = calculateDoubleDecliningDepreciation({
      cost,
      salvageValue,
      usefulLifeMonths,
      acquisitionDate,
      asOfDate: now,
    })

    const sl = calculateStraightLineDepreciation({
      cost,
      salvageValue,
      usefulLifeMonths,
      acquisitionDate,
      asOfDate: now,
    })

    assert.equal(ddb.method, DEPRECIATION_METHODS.DOUBLE_DECLINING)
    assert.equal(ddb.elapsedMonths, 12)
    // Double declining initial accumulated depreciation must exceed straight line
    assert.ok(ddb.accumulatedDepreciation > sl.accumulatedDepreciation)
    assert.ok(ddb.currentBookValue < sl.currentBookValue)
    assert.ok(ddb.currentBookValue >= salvageValue)
  })

  await t.test('5. generateDepreciationSchedule produces amortized schedule matching lifespan', () => {
    const cost = 12_000_000
    const salvageValue = 1_200_000
    const usefulLifeMonths = 12
    const acquisitionDate = new Date(2025, 0, 1)

    const schedule = generateDepreciationSchedule({
      cost,
      salvageValue,
      usefulLifeMonths,
      acquisitionDate,
      method: DEPRECIATION_METHODS.STRAIGHT_LINE,
    })

    assert.equal(schedule.length, 12)
    assert.equal(schedule[0].periodMonth, 1)
    assert.equal(schedule[11].periodMonth, 12)
    assert.equal(schedule[11].endingBookValue, salvageValue)
    assert.equal(schedule[11].accumulatedDepreciation, cost - salvageValue)
  })

  await t.test('6. Defensive handling for zero cost or missing inputs', () => {
    const zeroResult = calculateStraightLineDepreciation({
      cost: 0,
      salvageValue: 0,
      usefulLifeMonths: 0,
    })
    assert.equal(zeroResult.acquisitionCost, 0)
    assert.equal(zeroResult.currentBookValue, 0)
    assert.equal(zeroResult.monthlyDepreciation, 0)
    assert.equal(zeroResult.status, 'Fully Depreciated')
  })

  await t.test('7. calculateAssetDepreciation controller endpoint returns valid HTTP responses', async () => {
    const { calculateAssetDepreciation } = await import('../src/controllers/assetController.js')

    // Valid calculation
    const req = {
      body: {
        cost: 15_000_000,
        deviceType: 'Laptop Dell Latitude',
      },
    }
    let resData = null
    const res = {
      json: (data) => {
        resData = data
      },
      status: () => res,
    }

    await calculateAssetDepreciation(req, res)
    assert.ok(resData, 'Response data must be returned')
    assert.equal(resData.acquisitionCost, 15_000_000)
    assert.equal(resData.usefulLifeMonths, 48)
    assert.ok(Array.isArray(resData.schedule))
    assert.equal(resData.schedule.length, 48)

    // Invalid cost rejection
    let statusCode = null
    let errorData = null
    const invalidReq = { body: { cost: -500 } }
    const invalidRes = {
      status: (code) => {
        statusCode = code
        return {
          json: (err) => {
            errorData = err
          },
        }
      },
    }
    await calculateAssetDepreciation(invalidReq, invalidRes)
    assert.equal(statusCode, 400)
    assert.ok(errorData?.error)
  })
})
