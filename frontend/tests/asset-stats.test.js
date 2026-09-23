import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'

const cases = [
  ['AssetsView', 'status_aset', ['In Use', 'Stock', 'Damaged'], "get('/api/assets?all=true')"],
  [
    'AssetsGaView',
    'kondisi',
    ['Baik', 'Rusak Ringan', 'Rusak Berat'],
    "getAllPages('/api/ga-assets')",
  ],
  ['AssetsOpsView', 'status', ['Aktif', 'Maintenance', 'Rusak'], "getAllPages('/api/ops-assets')"],
]
for (const [view, field, statuses, loader] of cases) {
  const source = readFileSync(new URL(`../src/views/${view}.vue`, import.meta.url), 'utf8')
  test(`${view}: stats use whole category and refresh with loaded assets`, () => {
    assert.ok(source.includes(loader))
    const match = source.match(/const assetStats = computed\(\(\) => (\[[\s\S]*?\])\)/)
    assert.ok(match, 'category stats computed exists')
    const stats = new Function('assets', `return ${match[1]}`)
    assert.deepEqual(
      stats({ value: [] }).map((card) => card.value),
      [0, 0, 0, 0],
    )
    const assets = {
      value: [
        ...Array.from({ length: 21 }, () => ({ [field]: statuses[0] })),
        { [field]: statuses[1] },
        { [field]: statuses[2] },
        { [field]: 'Other' },
        {},
      ],
    }
    assert.deepEqual(
      stats(assets).map((card) => card.value),
      [25, 21, 1, 1],
    )
    assets.value.push({ [field]: statuses[2] })
    assert.deepEqual(
      stats(assets).map((card) => card.value),
      [26, 21, 1, 2],
    )
  })
  test(`${view}: loading and failures cannot show stale or fake zero stats`, () => {
    assert.match(source, /aria-label="Ringkasan aset"[\s\S]*?:aria-busy="isLoading"/)
    assert.match(
      source,
      /isLoading \? 'Memuat…' : pageError \? 'Tidak tersedia' : 'Seluruh data kategori'/,
    )
    assert.match(source, /:value="isLoading \|\| pageError \? '—' : stat.value"/)
    assert.match(source, /grid-cols-1 min-\[360px\]:grid-cols-2 xl:grid-cols-4/)
  })
}
