#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const TARGET_ROOT = ROOT;
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css']);
const MOJIBAKE_PATTERNS = [
  /Ãƒ./,
  /Ã‚./,
  /ï¿½/,
  /á»/,
  /Ä‘|Ä/,
  /áº|á»‹|á»|á»£|á»¥/,
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
      walk(fullPath, out);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;
    out.push(fullPath);
  }
  return out;
}

function getStagedFiles() {
  const raw = execSync('git diff --cached --name-only --diff-filter=ACMR', {
    cwd: path.join(ROOT, '..', '..'),
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
  });

  return raw
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.replaceAll('/', path.sep))
    .map((p) => path.join(path.join(ROOT, '..', '..'), p))
    .filter((p) => p.startsWith(TARGET_ROOT) && fs.existsSync(p) && fs.statSync(p).isFile());
}

function hasUtf8Bom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

const useStagedOnly = process.argv.includes('--staged');
const files = useStagedOnly ? getStagedFiles() : walk(TARGET_ROOT);
const violations = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel === 'scripts/check-encoding.cjs') continue;
  if (!EXTENSIONS.has(path.extname(file))) continue;
  const buffer = fs.readFileSync(file);
  const text = buffer.toString('utf8');

  if (hasUtf8Bom(buffer)) {
    violations.push({ file: rel, reason: 'UTF-8 BOM detected' });
  }

  for (const pattern of MOJIBAKE_PATTERNS) {
    if (pattern.test(text)) {
      violations.push({ file: rel, reason: `Potential mojibake pattern: ${pattern}` });
      break;
    }
  }
}

if (violations.length > 0) {
  console.error('Encoding check failed. Fix these files:');
  for (const v of violations) {
    console.error(`- ${v.file}: ${v.reason}`);
  }
  process.exit(1);
}

console.log('Encoding check passed.');

