// One-off: verify candidate skill repos actually contain SKILL.md (delete after use)
const candidates = [
  'obra/superpowers',
  'mattpocock/skills',
  'affaan-m/ECC',
  'multica-ai/andrej-karpathy-skills',
  'Shubhamsaboo/awesome-llm-apps',
  'nextlevelbuilder/ui-ux-pro-max-skill',
  'Graphify-Labs/graphify',
  'JuliusBrussee/caveman',
  'addyosmani/agent-skills',
  'Leonxlnx/taste-skill',
  'Egonex-AI/Understand-Anything',
  'tt-a1i/archify',
  'ComposioHQ/awesome-claude-skills',
  'calesthio/OpenMontage',
  'mvanhorn/last30days-skill',
  'ayghri/i-have-adhd',
  'blader/humanizer',
  'coreyhaines31/marketingskills',
  'code-yeongyu/oh-my-openagent',
  'thedotmack/claude-mem',
  'hesreallyhim/awesome-claude-code',
]

const H = { 'User-Agent': 'skill-search', Accept: 'application/vnd.github+json' }

async function listContents(repo, path) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: H })
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) ? data.map((d) => d.name) : null
}

for (const repo of candidates) {
  const root = await listContents(repo, '')
  if (root === null) {
    console.log(`${repo} -> HTTP error`)
    continue
  }
  const hasSkillMd = root.includes('SKILL.md')
  const skillDirs = root.filter((n) => /^(skills?|\.agents|\.claude)$/i.test(n))
  let nested = ''
  for (const dir of ['.agents/skills', 'skills', '.claude/skills', 'skill']) {
    const sub = await listContents(repo, dir)
    if (sub) {
      const skillSub = sub.filter((n) => n === 'SKILL.md' || n.endsWith('/SKILL.md'))
      if (skillSub.length || sub.some((n) => n.endsWith('.md'))) {
        nested += ` ${dir}: [${sub.slice(0, 6).join(', ')}]`
        break
      }
    }
  }
  console.log(`${repo} -> SKILL.md@root: ${hasSkillMd}${nested}`)
}
