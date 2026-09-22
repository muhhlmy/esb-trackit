#!/usr/bin/env node
/**
 * run-copy-linters.js
 *
 * Copy quality linter — detects AI-slop phrases and generic language
 * in user-facing text strings across the codebase.
 *
 * Scans: i18n files, content files, UI copy (Vue templates), documentation.
 * Does NOT modify code symbols, API names, JSON keys, variable names, routes,
 * or other technical identifiers.
 *
 * Usage:  node scripts/run-copy-linters.js
 */
'use strict'

import { readFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'

const ROOT = process.cwd()

const AI_SLOP_PATTERNS = [
  { phrase: /unlock[\.\s]/gi, reason: "AI-slop: 'unlock' implies capability removal that isn't real" },
  { phrase: /supercharge[\.\s]/gi, reason: "AI-slop: 'supercharge' is a marketing placeholder" },
  { phrase: /empower[\.\s]/gi, reason: "AI-slop: 'empower' is generic empowerment language" },
  { phrase: /seamless(?:ly)?\s/gi, reason: "AI-slop: 'seamlessly' is overused fluff" },
  { phrase: /cutting[-\s]edge/gi, reason: "AI-slop: 'cutting-edge' is a tired buzzword" },
  { phrase: /next[-\s]gen(?:eration)?/gi, reason: "AI-slop: 'next generation' is marketing filler" },
  { phrase: /elevate/gi, reason: "AI-slop: 'elevate' is vague action language" },
  { phrase: /revolutioni[sz]e/gi, reason: "AI-slop: 'revolutionize' is hyperbolic" },
  { phrase: /game[-\s]changing/gi, reason: "AI-slop: 'game-changing' is buzzword noise" },
  { phrase: /leverage/gi, reason: "AI-slop: 'leverage' is corporate jargon" },
  { phrase: /utilize/gi, reason: "AI-slop: 'utilize' instead of 'use'" },
  { phrase: /robust/gi, reason: "AI-slop: 'robust' is vague quality praise" },
  { phrase: /in today.s world/gi, reason: "AI-slop: faux-insight phrase" },
  { phrase: /at the end of the day/gi, reason: "AI-slop: meaningless filler phrase" },
  { phrase: /it.s worth noting/gi, reason: "AI-slop: throat-clearing opener" },
  { phrase: /this is huge/gi, reason: "AI-slop: importance puffery" },
]

function extractTemplateText(content) {
  const texts = []
  const interpolationMatch = content.match(/\{\{[^}]+\}\}/g)
  if (interpolationMatch) texts.push(...interpolationMatch)

  const ariaMatch = content.match(/:aria-label=["']([^"']*)["']/g)
  if (ariaMatch) texts.push(...ariaMatch)

  const staticAriaMatch = content.match(/aria-label\s*=\s*["']([^"']*)["']/g)
  if (staticAriaMatch) texts.push(...staticAriaMatch)

  const titleMatch = content.match(/title\s*=\s*["']([^"']*)["']/g)
  if (titleMatch) texts.push(...titleMatch)

  return texts
}

function extractJsonValues(content) {
  const texts = []
  try {
    const data = JSON.parse(content)
    function walk(obj) {
      if (typeof obj === 'string') {
        texts.push(obj)
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(walk)
      }
    }
    walk(data)
  } catch {
    // Not valid JSON, skip
  }
  return texts
}

const SKIP_DIRS = ['node_modules', 'dist', '.git', 'build', 'coverage', '__pycache__']

function walkDir(dir, extensions) {
  const results = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (SKIP_DIRS.includes(entry.name)) continue
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkDir(fullPath, extensions))
      } else if (extensions.includes(extname(entry.name))) {
        results.push(fullPath)
      }
    }
  } catch {
    /* permission error — skip */
  }
  return results
}

const findings = []

function scanFile(filePath, content) {
  let texts = []

  if (filePath.endsWith('.vue')) {
    texts = extractTemplateText(content)
  } else if (filePath.endsWith('.json') && content.trim().startsWith('{')) {
    texts = extractJsonValues(content)
  } else if (filePath.endsWith('.md')) {
    const withoutCode = content.replace(/```[\s\S]*?```/g, '')
    const lines = withoutCode.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    texts = lines.slice(0, 200)
  } else if (filePath.endsWith('.js')) {
    const strMatches = content.match(/['"`][^'"`]{20,}['"`]/g)
    texts = strMatches || []
  }

  for (const text of texts) {
    if (typeof text !== 'string') continue
    for (const pattern of AI_SLOP_PATTERNS) {
      if (pattern.phrase.test(text)) {
        findings.push({
          file: filePath.replace(ROOT + '/', ''),
          match: text.trim().slice(0, 80),
          reason: pattern.reason,
        })
        pattern.phrase.lastIndex = 0
      }
    }
  }
}

function main() {
  console.log('=== Copy Lint — AI-Slop Pattern Scanner ===\n')

  const scanDirs = [
    join(ROOT, 'frontend/src'),
    join(ROOT, 'frontend/locales'),
    join(ROOT, 'frontend/i18n'),
    join(ROOT, 'docs'),
  ]

  for (const dir of scanDirs) {
    const files = walkDir(dir, ['.vue', '.js', '.json'])
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf8')
        scanFile(file, content)
      } catch {
        /* skip unreadable files */
      }
    }
  }

  if (findings.length === 0) {
    console.log('✓ No AI-slop phrases detected in user-facing copy.')
    return 0
  }

  console.log(`Found ${findings.length} potential AI-slop occurrences:\n`)
  for (const f of findings) {
    console.log(`  ${f.file}`)
    console.log(`    -> "${f.match}"`)
    console.log(`    -> ${f.reason}\n`)
  }

  return 1
}

process.exit(main())
