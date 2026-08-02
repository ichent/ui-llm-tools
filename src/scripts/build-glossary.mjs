#!/usr/bin/env node
// Шаг 1 ubiquitous language: собрать список компонентов из Storybook index.json
//
// Запуск:
//   node build-glossary.mjs ./storybook-static/index.json
//
// Ничего не скачивает, не требует npm install, не ходит в интернет.
// На выходе — два файла рядом со скриптом:
//   glossary.json  — машиночитаемый список компонентов (перезаписывается)
//   overlay.json   — сюда РУКАМИ добавляешь смысл (создаётся один раз, не затирается)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// --- 1. читаем index.json ---
const indexPath = process.argv[2];
if (!indexPath) {
  console.error("Укажи путь: node build-glossary.mjs <path/to/index.json>");
  process.exit(1);
}
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const entries = Object.values(index.entries ?? {});

// --- 2. группируем записи по title (title = имя компонента) ---
const byTitle = new Map();
for (const e of entries) {
  if (!e.title) continue;
  if (!byTitle.has(e.title)) byTitle.set(e.title, []);
  byTitle.get(e.title).push(e);
}

// --- 3. превращаем каждую группу в компонент глоссария ---
const components = [];
for (const [title, group] of byTitle) {
  const term = title.split("/").pop();            // "Components/Modal" -> "Modal"
  const groupPath = title.split("/").slice(0, -1).join("/"); // "Components"
  const stories = group
    .filter((e) => e.type === "story")
    .map((e) => e.name);
  const importPath = group.find((e) => e.importPath)?.importPath ?? null;

  components.push({
    id: term,
    term,
    group: groupPath,   // категория из структуры сторибука
    stories,
    source: importPath,
  });
}
components.sort((a, b) => a.term.localeCompare(b.term));

const glossary = {
  version: 1,
  boundedContext: "design-system",
  generatedAt: new Date().toISOString(),
  components,
};

// --- 4. пишем машиночитаемый глоссарий ---
writeFileSync(join(here, "glossary.json"), JSON.stringify(glossary, null, 2) + "\n");

// --- 5. один раз создаём шаблон overlay.json для ручной семантики ---
const overlayPath = join(here, "overlay.json");
if (!existsSync(overlayPath)) {
  const overlay = {
    // сюда ты руками впишешь смысл по каждому компоненту.
    // ключ = id из glossary.json
    components: Object.fromEntries(
      components.map((c) => [
        c.id,
        {
          summary: "",        // одна строка: что это
          whenToUse: "",      // когда использовать
          aliasesPixso: [],   // как это зовут в макетах Pixso (это и есть ACL)
        },
      ])
    ),
  };
  writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + "\n");
  console.log(`Создан overlay.json — заполни его руками (по одному компоненту).`);
}

// --- 6. краткий отчёт ---
console.log(`Готово. Компонентов: ${components.length}`);
console.log("Первые несколько:");
for (const c of components.slice(0, 10)) {
  console.log(`  - ${c.term}  (${c.stories.length} примеров)`);
}
