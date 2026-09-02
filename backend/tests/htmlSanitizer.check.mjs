import { sanitizeRichTextHtml } from '../src/security/htmlSanitizer.js'

const attacks = [
  '<p>Normal <strong>bold</strong></p>',
  '<script>alert(1)</script><p>safe</p>',
  '<img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">click</a>',
  '<iframe src="https://evil.com"></iframe>',
  '<div style="background:url(evil)">x</div>',
  '<p onclick="alert(1)">click</p>',
  '<h2>Title</h2><ul><li>item</li></ul>',
]

for (const html of attacks) {
  const out = sanitizeRichTextHtml(html)
  console.log(JSON.stringify(html), '->', JSON.stringify(out))
}

// Assertions
const assert = (await import('node:assert/strict')).default
assert.equal(sanitizeRichTextHtml('<script>alert(1)</script><p>safe</p>'), '<p>safe</p>')
assert.ok(!sanitizeRichTextHtml('<img src=x onerror=alert(1)>').includes('onerror'))
assert.ok(!sanitizeRichTextHtml('<a href="javascript:alert(1)">c</a>').toLowerCase().includes('javascript:'))
assert.ok(!sanitizeRichTextHtml('<iframe src="https://evil.com"></iframe>').includes('iframe'))
assert.ok(!sanitizeRichTextHtml('<div style="x">y</div>').includes('style'))
assert.equal(sanitizeRichTextHtml('<h2>Title</h2><ul><li>item</li></ul>'), '<h2>Title</h2><ul><li>item</li></ul>')
assert.equal(sanitizeRichTextHtml(''), '')
console.log('ALL SANITIZER CHECKS PASSED')
