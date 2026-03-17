#!/usr/bin/env node
/**
 * Stub agent fixer: parses PR comments JSON and emits a summary markdown.
 * Replace the middle section with real automation (e.g., apply patches, run tools).
 */
import fs from 'node:fs'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: node scripts/agent-fix.js <comments.json>')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const lines = []
const unresolvedIds = []

lines.push('# Agent Fix Pass')
lines.push('')

const collectThreads = () => {
  const items = []
  for (const thread of data.reviewThreads || []) {
    const unresolved = thread.isResolved === false || thread.isOutdated === false
    if (unresolved && thread.id) unresolvedIds.push(thread.id)
    const summary = (thread.comments || [])
      .map((c) => c.bodyText || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)
    items.push({ unresolved, summary })
  }
  return items
}

const threads = collectThreads()
const unresolved = threads.filter((t) => t.unresolved)

if (unresolved.length === 0) {
  lines.push('- No unresolved review threads detected.')
} else {
  lines.push('- Unresolved review threads:')
  unresolved.forEach((t, idx) => {
    lines.push(`  - [ ] #${idx + 1}: ${t.summary || '(no summary)'}`)
  })
}

lines.push('')
lines.push('> Stub mode: replace scripts/agent-fix.js with real fix logic that maps comments to code changes.')

fs.writeFileSync('agent-summary.md', lines.join('\n'), 'utf8')
fs.writeFileSync('unresolved_threads.txt', unresolvedIds.join('\n'), 'utf8')
console.log(lines.join('\n'))
