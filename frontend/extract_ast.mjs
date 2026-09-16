import { parse } from '@vue/compiler-sfc'
import { readFileSync, writeFileSync } from 'node:fs'

const tmp = process.env.LOCALAPPDATA + '/Temp'
const orig = readFileSync(tmp + '/MyAssetsView.orig.vue', 'utf-8')
const { descriptor, errors } = parse(orig, { filename: 'orig' })
if (errors.length) { console.log('ORIG PARSE ERRORS'); process.exit(1) }

const root = descriptor.template.ast
// levels are children of the root <div>, not the template root
const pageDiv = root.children.find((n) => n.tag === 'div')
const levels = {}
const others = []
for (const n of pageDiv.children) {
  if (n.tag === 'template' && n.props?.length) {
    const d = n.props.find((p) => p.name === 'if' || p.name === 'else-if')
    const m = (d?.exp?.content || '').match(/currentLevel === (\d)/)
    if (m) { levels[m[1]] = n; continue }
  }
  if (n.type !== 2) others.push(n)  // skip whitespace text nodes
}

console.log('levels:', Object.keys(levels).join(','), '| other root nodes:', others.length)

const slice = (n) => orig.slice(n.loc.start.offset, n.loc.end.offset)

// child: inner children of level-1 template
const l1Body = levels['1'].children
  .filter((c) => c.type !== 2 || c.content.trim())
  .map((c) => slice(c))
  .join('\n')

const l2Block = slice(levels['2'])
const l3Block = slice(levels['3'])
const modals = others
  .filter((n) => n.loc.start.offset > levels['3'].loc.end.offset)
  .map((c) => slice(c))
  .join('\n')

console.log('l1', l1Body.split('\n').length, '| l2', l2Block.split('\n').length,
  '| l3', l3Block.split('\n').length, '| modals', modals.split('\n').length)

writeFileSync(tmp + '/ast_l1.txt', l1Body)
writeFileSync(tmp + '/ast_l2.txt', l2Block)
writeFileSync(tmp + '/ast_l3.txt', l3Block)
writeFileSync(tmp + '/ast_modals.txt', modals)
console.log('saved')
