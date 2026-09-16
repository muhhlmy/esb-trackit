import { parse } from '@vue/compiler-sfc'
import { readFileSync } from 'node:fs'

const path = process.argv[2]
const src = readFileSync(path, 'utf-8')
const { descriptor, errors } = parse(src, { filename: path })
if (errors.length) {
  for (const e of errors) console.log('ERR', e.loc?.start?.line, e.message)
} else {
  console.log('OK template ends line', descriptor.template?.loc.end.line)
}
