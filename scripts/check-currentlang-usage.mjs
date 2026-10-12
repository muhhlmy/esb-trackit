import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function getVueFiles(dir) {
  let results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results = results.concat(getVueFiles(full));
    } else if (full.endsWith('.vue')) {
      results.push(full);
    }
  }
  return results;
}

const vueFiles = getVueFiles('frontend/src');
const missing = [];

for (const file of vueFiles) {
  const content = readFileSync(file, 'utf8');
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch) continue;
  const templateContent = templateMatch[1];
  if (templateContent.includes('currentLang')) {
    const scriptMatch = content.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/);
    const scriptContent = scriptMatch ? scriptMatch[1] : '';
    if (!scriptContent.includes('currentLang')) {
      missing.push(file);
    }
  }
}

console.log('Vue files using currentLang in template without defining it in script:', missing);
