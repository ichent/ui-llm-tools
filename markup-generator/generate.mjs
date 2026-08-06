#!/usr/bin/env node
// Единая обёртка над пайплайном: clean -> resolve -> assemble.
//
// Запуск:
//   node generate.mjs [pixso-to-json.json] [GeneratedModal.tsx]
//
// Промежуточные файлы (pixso-clean.json, pixso-spec.json) создаются рядом.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const input = process.argv[2] ?? 'pixso-to-json.json';
const output = process.argv[3] ?? 'GeneratedModal.tsx';

const CLEAN = 'pixso-clean.json';
const SPEC = 'pixso-spec.json';

const steps = [
  { name: '1/3 clean   ', script: 'clean-pixso.mjs', args: [input, CLEAN] },
  { name: '2/3 resolve ', script: 'resolve-pixso.mjs', args: [CLEAN, SPEC] },
  { name: '3/3 assemble', script: 'assemble-pixso.mjs', args: [SPEC, output] },
];

for (const { name, script, args } of steps) {
  console.log(`\n=== ${name} (${script}) ===`);
  const r = spawnSync('node', [resolve(here, script), ...args], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n✖ Ошибка на шаге ${script} (код ${r.status ?? 'null'})`);
    process.exit(r.status ?? 1);
  }
}

console.log(`\n✔ Пайплайн завершён: ${output}`);
