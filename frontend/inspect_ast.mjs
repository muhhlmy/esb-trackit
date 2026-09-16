import { parse } from '@vue/compiler-sfc'
import { readFileSync } from 'node:fs'

const tmp = process.env.LOCALAPPDATA + '/Temp'
const orig = readFileSync(tmp + '/MyAssetsView.orig.vue', 'utf-8')
const { descriptor } = parse(orig, { filename: 'orig' })
const root = descriptor.template.ast
const pageDiv = root.children.find((n) => n.tag === 'div')
for (const n of pageDiv.children) {
  if (n.type === 2) { console.log('TEXT', JSON.stringify(n.content).slice(0, 30)); continue }
  const dirs = (n.props || []).map((p) => `${p.name}=${JSON.stringify(p.value?.content || '').slice(0, 45)}`)
  console.log(n.tag, dirs.join(' '))
}
