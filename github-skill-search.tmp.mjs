// One-off: aggregate GitHub search results for skill repositories, ranked by stars (delete after use)
const queries = [
  'claude+skills',
  'agent+skills',
  'topic:claude-skills',
  'awesome+claude+skills',
  'claude+skill+SKILL.md',
]

const seen = new Map()
for (const q of queries) {
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=25`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'skill-search', Accept: 'application/vnd.github+json' } })
    if (!res.ok) {
      console.log(`query ${q} -> HTTP ${res.status}`)
      continue
    }
    const data = await res.json()
    for (const item of data.items ?? []) {
      const prev = seen.get(item.full_name)
      if (!prev || item.stargazers_count > prev.stargazers_count) {
        seen.set(item.full_name, {
          name: item.full_name,
          stars: item.stargazers_count,
          desc: (item.description ?? '').slice(0, 110),
          url: item.html_url,
          matched: q,
        })
      }
    }
  } catch (e) {
    console.log(`query ${q} failed: ${e.message}`)
  }
}

const ranked = [...seen.values()].sort((a, b) => b.stars - a.stars)
console.log(`unique repos: ${ranked.length}`)
for (const [i, r] of ranked.slice(0, 30).entries()) {
  console.log(`${i + 1}. ${r.stars.toLocaleString()} | ${r.name} | ${r.desc}`)
}
