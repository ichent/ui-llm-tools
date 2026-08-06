#!/usr/bin/env node
// Детерминированно вытаскивает валидный набор пропсов каждого компонента из
// реальных примеров сторибука (без LLM).
//
// Запуск:
//   FRONTDRIVE_STORYBOOK_ROOT=/path/to/ui-kit node props-from-examples.mjs
//
// Читает .stories.tsx (пути берёт из storybook-df.json / strybook-plasma.json),
// извлекает имена пропсов из JSX-использований компонента и из args/argTypes.
// Результат -> component-props.json: { Name: { kit, file, props: [...] } }

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.FRONTDRIVE_STORYBOOK_ROOT;
if (!ROOT) {
  console.error('✖ Задай FRONTDRIVE_STORYBOOK_ROOT=/path/to/ui-kit');
  process.exit(1);
}

const KITS = [
  { file: 'storybook-df.json', kit: 'df' },
  { file: 'strybook-plasma.json', kit: 'plasma' },
];

// name(lowercase) -> { name, kit, tsx, mdx }
const catalog = new Map();
for (const { file, kit } of KITS) {
  if (!existsSync(file)) continue;
  const entries = JSON.parse(readFileSync(file, 'utf8')).entries ?? {};
  for (const e of Object.values(entries)) {
    const name = (e.title ?? '').split('/').pop()?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (catalog.has(key)) continue; // df приоритетнее (идёт первым)
    const tsx = (e.storiesImports ?? []).find((p) => p.endsWith('.stories.tsx'));
    const mdx = e.importPath?.endsWith('.mdx') ? e.importPath : undefined;
    catalog.set(key, { name, kit, tsx, mdx });
  }
}

const rel = (p) => join(ROOT, p.replace(/^\.\//, ''));

function extractProps(src, name) {
  const props = new Set();

  // 1) JSX-использования: <Name ...props...>
  const tagRe = new RegExp(`<${name}\\b([\\s\\S]*?)(?:/>|>)`, 'g');
  let m;
  while ((m = tagRe.exec(src))) {
    for (const pm of m[1].matchAll(/(?:^|\s)([A-Za-z_][\w]*)\s*=/g)) props.add(pm[1]);
  }

  // 2) args: { prop: ... } и argTypes: { prop: {...} }
  for (const block of ['args', 'argTypes']) {
    const re = new RegExp(`${block}\\s*:\\s*\\{`, 'g');
    let bm;
    while ((bm = re.exec(src))) {
      let i = bm.index + bm[0].length - 1; // на открывающей {
      let depth = 0;
      const start = i + 1;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) break; }
      }
      const body = src.slice(start, i);
      for (const km of body.matchAll(/(?:^|[,{]\s*)([A-Za-z_][\w]*)\s*:/g)) props.add(km[1]);
    }
  }
  return [...props].sort();
}

const out = {};
let ok = 0, miss = 0, nofile = 0;
for (const [, info] of catalog) {
  const path = info.tsx ?? info.mdx;
  if (!path) { miss++; continue; }
  const abs = rel(path);
  if (!existsSync(abs)) { nofile++; continue; }
  const src = readFileSync(abs, 'utf8');
  const props = extractProps(src, info.name);
  out[info.name] = { kit: info.kit, file: path, props };
  ok += props.length ? 1 : 0;
}

writeFileSync('component-props.json', JSON.stringify(out, null, 2) + '\n');
console.log(`Готово: component-props.json`);
console.log(`  Компонентов в каталоге: ${catalog.size}`);
console.log(`  С извлечёнными пропсами: ${ok}`);
console.log(`  Без файла примера: ${miss}, файл не найден в ROOT: ${nofile}`);
