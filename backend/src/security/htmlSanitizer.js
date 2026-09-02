import DOMPurify from 'isomorphic-dompurify'

// Whitelist tag TipTap + atribut aman untuk konten rich-text SOP/knowledge base.
// Segala tag/atribut di luar daftar (script, iframe, event handler, dsb.) dihapus.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
]

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'colspan', 'rowspan', 'target', 'rel']

export function sanitizeRichTextHtml(html) {
  if (typeof html !== 'string' || html === '') return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_ATTR: ['style'],
    ALLOW_DATA_ATTR: false,
  })
}
