import { readFileSync, existsSync } from 'node:fs';

function terms(path) {
  const idx = JSON.parse(readFileSync(path, 'utf8'));
  const byTitle = new Map();
  for (const e of Object.values(idx.entries ?? {})) {
    if (!e.title) continue;
    if (!byTitle.has(e.title)) byTitle.set(e.title, []);
    byTitle.get(e.title).push(e);
  }
  const set = new Set();
  for (const [title, group] of byTitle) {
    const hasStory = group.some((e) => e.type === 'story');
    if (!hasStory) continue;
    set.add(title.split('/').pop());
  }
  return set;
}

const dfPath = 'storybook-df.json';
const plasmaPath = existsSync('storybook-plasma.json') ? 'storybook-plasma.json' : 'strybook-plasma.json';

const df = terms(dfPath);
const plasma = terms(plasmaPath);

console.log(`DF (${dfPath}): ${df.size} компонентов`);
console.log(`Plasma (${plasmaPath}): ${plasma.size} компонентов`);

const need = ['Flow', 'Combobox', 'ComboboxSingle', 'Autocomplete', 'TextField', 'Button', 'IconButton', 'DatePicker', 'Divider', 'CheckBox', 'Checkbox', 'ModalDF', 'Modal', 'Badge', 'Counter', 'QuantityBadge', 'Tooltip'];
console.log('\n=== проверка нужных компонентов ===');
for (const n of need) {
  const inDf = df.has(n);
  const inPl = plasma.has(n);
  const where = inDf && inPl ? 'DF+Plasma' : inDf ? 'DF' : inPl ? 'Plasma' : '❌ НЕТ';
  console.log(`  ${n.padEnd(16)} → ${where}`);
}

console.log('\n=== Plasma компоненты (все) ===');
console.log([...plasma].sort().join(', '));
