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
  // Check if template uses t( or t('
  const usesTInTemplate = /<template>[\s\S]*?[^a-zA-Z0-9_]t\([\s\S]*?<\/template>/.test(content);
  if (usesTInTemplate) {
    const hasUseLanguage = content.includes('useLanguage');
    const definesT = /\bconst\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage/.test(content) || /\bconst\s+t\s*=/.test(content);
    if (!definesT) {
      missing.push({ file, hasUseLanguage, definesT });
    }
  }
}

console.log('Components with missing t definition:', JSON.stringify(missing, null, 2));
