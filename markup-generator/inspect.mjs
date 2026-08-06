import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('./pixso-to-json.json', import.meta.url), 'utf8'));

// 1) верхний уровень
console.log('=== TOP-LEVEL KEYS ===');
console.log(Object.keys(raw));

const roots = Array.isArray(raw.nodes) ? raw.nodes : [raw.nodes];
console.log('\nroots count:', roots.length);
console.log('root[0] keys:', Object.keys(roots[0] ?? {}));

const childKeys = new Set(['children']); // теперь знаем точно
const kidsOf = (node) => (Array.isArray(node.children) ? node.children : []);

// 2) обход дерева
const typeCount = new Map();
const keysByType = new Map();
const samples = {};
let total = 0;
let maxDepth = 0;

function walk(node, depth = 0) {
  if (!node || typeof node !== 'object') return;
  total++;
  maxDepth = Math.max(maxDepth, depth);
  const t = node.type ?? '(no type)';
  typeCount.set(t, (typeCount.get(t) ?? 0) + 1);

  if (!keysByType.has(t)) keysByType.set(t, new Set());
  for (const k of Object.keys(node)) keysByType.get(t).add(k);

  // сэмплы
  if (!samples[t]) samples[t] = node;
  if (t === 'INSTANCE' && node.name) instanceNames.push(node.name);
  if (t === 'TEXT' && !samples.TEXT) samples.TEXT = node;

  for (const c of kidsOf(node)) walk(c, depth + 1);
}
const instanceNames = [];
roots.forEach((r) => walk(r));

console.log('\n=== INSTANCE NAMES (все) ===');
console.log([...new Set(instanceNames)].join('\n'));

console.log('\n=== NODES:', total, ' maxDepth:', maxDepth, '===');
console.log('\n=== TYPE DISTRIBUTION ===');
for (const [t, n] of [...typeCount].sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`);

console.log('\n=== KEYS PER TYPE ===');
for (const [t, set] of keysByType) console.log(`  ${t}: ${[...set].join(', ')}`);

// 3) урезанный сэмпл ноды (без глубоких children)
function shallow(node) {
  if (!node) return node;
  const o = {};
  for (const [k, v] of Object.entries(node)) {
    if (childKeys.has(k)) { o[k] = `[${(v ?? []).length} children]`; continue; }
    if (typeof v === 'object' && v !== null) {
      const s = JSON.stringify(v);
      o[k] = s.length > 300 ? s.slice(0, 300) + '…' : v;
    } else o[k] = v;
  }
  return o;
}

for (const key of ['TEXT', 'INSTANCE']) {
  if (samples[key]) {
    console.log(`\n=== SAMPLE: ${key} ===`);
    console.log(JSON.stringify(shallow(samples[key]), null, 2));
  }
}

// СЕМАНТИЧЕСКИЙ СКЕЛЕТ: имена+тип, без декоративных нод, до глубины 6
const DECOR = new Set(['RECTANGLE', 'ELLIPSE', 'VECTOR', 'BOOLEAN_OPERATION', 'LINE']);
console.log('\n=== SKELETON (без декора, depth<=6) ===');
function skeleton(node, depth = 0) {
  if (!node || DECOR.has(node.type)) return;
  if (depth > 6) return;
  const lm = node.autoLayout?.mode && node.autoLayout.mode !== 'NONE' ? ` [${node.autoLayout.mode}]` : '';
  console.log('  '.repeat(depth) + `${node.type}: ${JSON.stringify(node.name)}${lm}`);
  for (const c of kidsOf(node)) skeleton(c, depth + 1);
}
roots.forEach((r) => skeleton(r));
