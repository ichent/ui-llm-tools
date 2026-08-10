#!/usr/bin/env node

/**
 * ui-kit-paths — MCP: каталог UI-KIT из локальных Storybook index.json.
 *
 * Запуск:
 *   node ui-kit-paths.js <index.json> [index.json ...]
 *   UIKIT_INDEX_PATHS=./data/storybook-df.json,./data/storybook-plasma.json node ui-kit-paths.js
 *
 * Опционально kit явно: kit=path
 *   node ui-kit-paths.js df=./data/storybook-df.json plasma=./data/storybook-plasma.json
 *
 * Приоритет при коллизии имён: порядок загрузки индексов (первый побеждает),
 * либо UIKIT_KIT_PRIORITY=df,plasma
 *
 * Отдаёт только kit + относительные пути в репозитории UI-KIT.
 * Исходники не читает — их тянет отдельный MCP (например Bitbucket), который стыкует агент.
 *
 * Handshake (initialize) отвечает сразу; индексы грузятся лениво при первом tools/call.
 */

import { readFileSync, existsSync } from 'fs';
import { basename, resolve } from 'path';

const DEFAULT_PRIORITY = (process.env.UIKIT_KIT_PRIORITY || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function parseIndexArgs(argv) {
  const fromEnv = (process.env.UIKIT_INDEX_PATHS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const raw = argv.length ? argv : fromEnv;
  const specs = [];

  for (const item of raw) {
    const eq = item.indexOf('=');
    if (eq > 0 && !item.slice(0, eq).includes('/') && !item.slice(0, eq).includes('\\')) {
      specs.push({ kit: item.slice(0, eq).trim().toLowerCase(), path: resolve(item.slice(eq + 1).trim()) });
    } else {
      const path = resolve(item);
      specs.push({ kit: kitIdFromPath(path), path });
    }
  }
  return specs;
}

function kitIdFromPath(path) {
  const base = basename(path).toLowerCase().replace(/\.json$/, '');
  // storybook-df / index-df / df → df
  const m = base.match(/(?:storybook[-_])?(.+)$/);
  return (m?.[1] || base).replace(/^strybook[-_]/, ''); // typo fallback from README
}

function normalizeRepoPath(importPath) {
  if (!importPath) return null;
  return importPath.replace(/^\.\//, '');
}

function componentNameFromTitle(title) {
  if (!title) return null;
  const parts = String(title).split('/').map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || null;
}

function loadIndex(spec) {
  if (!existsSync(spec.path)) {
    throw new Error(`index.json не найден: ${spec.path}`);
  }
  const raw = JSON.parse(readFileSync(spec.path, 'utf-8'));
  const version = raw.v ?? raw.version ?? null;
  const entries = raw.entries;
  if (!entries || typeof entries !== 'object') {
    throw new Error(`Нет поля entries в ${spec.path}`);
  }

  /** @type {Map<string, object>} */
  const byName = new Map();

  for (const entry of Object.values(entries)) {
    const name = componentNameFromTitle(entry.title);
    if (!name) continue;

    const key = name.toLowerCase();
    let comp = byName.get(key);
    if (!comp) {
      const titleParts = String(entry.title).split('/').map((p) => p.trim()).filter(Boolean);
      comp = {
        name,
        kit: spec.kit,
        indexVersion: version,
        indexPath: spec.path,
        category: titleParts.length > 1 ? titleParts.slice(0, -1).join('/') : '',
        title: entry.title,
        stories: [],
        docs: [],
        storiesPaths: [],
        docsPaths: [],
        componentPaths: [],
        exportNames: [],
        tags: new Set(),
      };
      byName.set(key, comp);
    }

    const repoPath = normalizeRepoPath(entry.importPath);
    if (entry.type === 'docs') {
      comp.docs.push({
        id: entry.id,
        name: entry.name,
        importPath: repoPath,
      });
      if (repoPath) comp.docsPaths.push(repoPath);
      for (const si of entry.storiesImports || []) {
        const p = normalizeRepoPath(si);
        if (p) comp.storiesPaths.push(p);
      }
    } else if (entry.type === 'story') {
      comp.stories.push({
        id: entry.id,
        name: entry.name,
        exportName: entry.exportName || null,
        subtype: entry.subtype || 'story',
        importPath: repoPath,
      });
      if (repoPath) comp.storiesPaths.push(repoPath);
      if (entry.exportName) comp.exportNames.push(entry.exportName);
      if (entry.componentPath) {
        const cp = normalizeRepoPath(entry.componentPath);
        if (cp) comp.componentPaths.push(cp);
      }
    }

    for (const t of entry.tags || []) comp.tags.add(t);
  }

  const components = [...byName.values()].map((c) => ({
    ...c,
    storiesPaths: uniq(c.storiesPaths),
    docsPaths: uniq(c.docsPaths),
    componentPaths: uniq(c.componentPaths),
    exportNames: uniq(c.exportNames),
    tags: [...c.tags],
    storyNames: c.stories.map((s) => s.name),
  }));

  return {
    kit: spec.kit,
    path: spec.path,
    version,
    entryCount: Object.keys(entries).length,
    components,
  };
}

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

const INDEX_SPECS = parseIndexArgs(process.argv.slice(2));

/** @type {null | { kits: object[], all: object[], order: string[] }} */
let registry = null;

function ensureRegistry() {
  if (registry) return registry;
  if (!INDEX_SPECS.length) {
    registry = { kits: [], all: [], order: [] };
    return registry;
  }

  const t0 = Date.now();
  const kits = INDEX_SPECS.map((spec) => loadIndex(spec));
  const order = DEFAULT_PRIORITY.length
    ? DEFAULT_PRIORITY
    : kits.map((k) => k.kit);

  const all = [];
  for (const kit of kits) {
    for (const c of kit.components) all.push(c);
  }

  // sort kits for collision resolution
  const kitRank = (kit) => {
    const i = order.indexOf(kit);
    return i === -1 ? 1000 : i;
  };

  registry = { kits, all, order, kitRank };
  console.error(
    `[ui-kit-paths] loaded ${kits.length} index(es), ${all.length} components ` +
      `(${Date.now() - t0}ms). kits=${kits.map((k) => `${k.kit}:v${k.version}`).join(', ')}`,
  );
  return registry;
}

function findComponent(name, kitFilter = 'auto') {
  const { all, kitRank } = ensureRegistry();
  const q = name?.trim().toLowerCase();
  if (!q) return null;

  let candidates = all.filter((c) => c.name.toLowerCase() === q);
  if (kitFilter && kitFilter !== 'auto' && kitFilter !== 'all') {
    candidates = candidates.filter((c) => c.kit === kitFilter);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => kitRank(a.kit) - kitRank(b.kit));
  return candidates[0];
}

function scoreMatch(comp, query) {
  const q = query.toLowerCase();
  const n = comp.name.toLowerCase();
  let score = 0;
  if (n === q) score += 100;
  else if (n.startsWith(q)) score += 50;
  else if (n.includes(q)) score += 25;
  if ((comp.category || '').toLowerCase().includes(q)) score += 5;
  if ((comp.title || '').toLowerCase().includes(q)) score += 3;
  return score;
}

function sourcePathsPayload(comp) {
  const paths = uniq([
    ...comp.storiesPaths,
    ...comp.componentPaths,
    ...comp.docsPaths.filter((p) => /\.(tsx|ts|jsx|js)$/.test(p)),
  ]);

  return {
    component: comp.name,
    kit: comp.kit,
    indexVersion: comp.indexVersion,
    paths,
    storiesPaths: comp.storiesPaths,
    componentPaths: comp.componentPaths,
    docsPaths: comp.docsPaths,
    exportNames: comp.exportNames,
  };
}

function send(msg) {
  // JSON-RPC NDJSON — тот же транспорт, что у mcp/UIKIT_MCP/server.mjs
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function ok(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function fail(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function textResult(text) {
  return { content: [{ type: 'text', text }] };
}

function jsonResult(obj) {
  return textResult(JSON.stringify(obj, null, 2));
}

function handleToolsCall(params) {
  const name = params?.name;
  const a = params?.arguments ?? {};

  if (!INDEX_SPECS.length) {
    return textResult(
      'ui-kit-paths: не заданы пути к index.json. ' +
        'Запуск: node ui-kit-paths.js <index.json> [...] или UIKIT_INDEX_PATHS=...',
    );
  }

  ensureRegistry();

  switch (name) {
    case 'list_kits': {
      const { kits, order } = ensureRegistry();
      return jsonResult({
        kitPriority: order,
        kits: kits.map((k) => ({
          kit: k.kit,
          indexVersion: k.version,
          indexPath: k.path,
          components: k.components.length,
          entries: k.entryCount,
        })),
      });
    }

    case 'list_components': {
      const { all, kitRank } = ensureRegistry();
      const kit = a.kit ?? 'all';
      let items = kit === 'all' ? [...all] : all.filter((c) => c.kit === kit);
      if (a.category) {
        const cat = String(a.category).toLowerCase();
        items = items.filter((c) => (c.category || '').toLowerCase().includes(cat));
      }
      items.sort((x, y) => kitRank(x.kit) - kitRank(y.kit) || x.name.localeCompare(y.name));
      return jsonResult({
        count: items.length,
        components: items.map((c) => ({
          name: c.name,
          kit: c.kit,
          category: c.category,
          stories: c.storyNames.length,
          hasComponentPath: c.componentPaths.length > 0,
        })),
      });
    }

    case 'search_components': {
      const query = String(a.query || '').trim();
      if (!query) return textResult('Нужен аргумент query');
      const limit = Number(a.limit ?? 8);
      const kit = a.kit ?? 'all';
      const { all } = ensureRegistry();

      const scored = all
        .filter((c) => kit === 'all' || c.kit === kit)
        .map((c) => ({ ...c, score: scoreMatch(c, query) }))
        .filter((c) => c.score > 0)
        .sort((x, y) => y.score - x.score || x.name.localeCompare(y.name))
        .slice(0, limit);

      return jsonResult({
        query,
        count: scored.length,
        results: scored.map((c) => ({
          name: c.name,
          kit: c.kit,
          category: c.category,
          title: c.title,
          indexVersion: c.indexVersion,
          storiesPaths: c.storiesPaths,
          componentPaths: c.componentPaths,
          score: c.score,
        })),
      });
    }

    case 'get_component': {
      const compName = a.name?.trim();
      if (!compName) return textResult('Нужен аргумент name');
      const comp = findComponent(compName, a.kit ?? 'auto');
      if (!comp) {
        return textResult(
          `Компонент «${compName}» не найден в загруженных index.json. ` +
            'Попробуй search_components.',
        );
      }
      return jsonResult({
        name: comp.name,
        kit: comp.kit,
        category: comp.category,
        title: comp.title,
        indexVersion: comp.indexVersion,
        indexPath: comp.indexPath,
        storyNames: comp.storyNames,
        exportNames: comp.exportNames,
        storiesPaths: comp.storiesPaths,
        componentPaths: comp.componentPaths,
        docsPaths: comp.docsPaths,
        tags: comp.tags,
        note:
          'index.json не содержит API пропсов. Вызови get_source_paths, затем прочитай файлы отдельным MCP (репозиторий UI-KIT).',
      });
    }

    case 'get_source_paths': {
      const compName = a.name?.trim();
      if (!compName) return textResult('Нужен аргумент name');
      const comp = findComponent(compName, a.kit ?? 'auto');
      if (!comp) return textResult(`Компонент «${compName}» не найден.`);
      return jsonResult(sourcePathsPayload(comp));
    }

    default:
      throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32601 });
  }
}

const TOOLS = [
  {
    name: 'list_kits',
    description:
      'Список загруженных Storybook index.json (kit, версия формата v4/v5, число компонентов).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_components',
    description:
      'Детерминированный поиск компонента по имени в локальных Storybook index.json (несколько UI-KIT, v4/v5).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Имя или фрагмент (например Divider, Search)' },
        limit: { type: 'number', description: 'Макс. результатов (по умолч. 8)' },
        kit: { type: 'string', description: 'Фильтр kit (df, plasma, …) или all' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_component',
    description:
      'Карточка компонента из index.json: kit, category, пути к stories/docs/component. Без пропсов — их нет в index.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Имя компонента (последний сегмент title)' },
        kit: {
          type: 'string',
          description: 'auto | df | plasma | … (auto = приоритет из UIKIT_KIT_PRIORITY / порядка загрузки)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_source_paths',
    description:
      'Относительные пути к исходникам компонента в репозитории UI-KIT (stories, component, docs). ' +
      'Сам код не читает — дальше агент берёт файлы отдельным MCP по этим paths и kit.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Имя компонента' },
        kit: { type: 'string', description: 'auto | конкретный kit' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_components',
    description: 'Полный список компонентов из загруженных индексов.',
    inputSchema: {
      type: 'object',
      properties: {
        kit: { type: 'string', description: 'all или id кита' },
        category: { type: 'string', description: 'Фильтр категории (подстрока)' },
      },
    },
  },
];

async function main() {
  console.error(
    `[ui-kit-paths] ready (lazy load). indexes=${INDEX_SPECS.map((s) => `${s.kit}@${s.path}`).join(' | ') || '—'}`,
  );

  let buffer = '';
  for await (const chunk of process.stdin) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }

      const { method, params, id } = msg;
      // уведомления без id — игнор (в т.ч. notifications/initialized)
      if (id === undefined || id === null) continue;

      try {
        switch (method) {
          case 'initialize':
            ok(id, {
              protocolVersion: '2024-11-05',
              serverInfo: { name: 'ui-kit-paths', version: '1.0.2' },
              capabilities: { tools: {} },
            });
            break;

          case 'ping':
            ok(id, {});
            break;

          case 'tools/list':
            ok(id, { tools: TOOLS });
            break;

          case 'tools/call':
            ok(id, handleToolsCall(params));
            break;

          default:
            fail(id, -32601, `Unknown method: ${method}`);
        }
      } catch (e) {
        fail(id, e.code ?? -32603, e.message || String(e));
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
