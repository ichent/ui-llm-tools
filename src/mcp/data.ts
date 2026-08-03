import fs from 'node:fs';
import path from 'node:path';
import { packageRoot } from '../core/paths.js';
import { MOCK_EXAMPLE_CODE, MOCK_EXAMPLE_PATH } from './mock.js';

/** Фича агрегата (напр. Table/Editing), как её собрал build-glossary. */
export interface Feature {
  name: string;
  examples: number;
  source: string | null;
}

/** Компонент из glossary.json (машинная модель ubiquitous language). */
export interface GlossaryComponent {
  id: string;
  term: string;
  group: string;
  kind: 'component' | 'aggregate';
  stories: string[];
  features: Feature[];
  source: string | null;
}

/** Ручная семантика из overlay.json (по ключу = id компонента). */
export interface OverlayEntry {
  summary?: string;
  whenToUse?: string;
  aliasesPixso?: string[];
}

/** Готовая карточка компонента: модель + семантика. */
export interface ComponentCard extends GlossaryComponent {
  summary: string;
  whenToUse: string;
  aliasesPixso: string[];
}

/** Где искать данные. Всё переопределяется через env. */
const GLOSSARY_DIR =
  process.env.FRONTDRIVE_GLOSSARY_DIR ?? path.join(packageRoot(), 'glossary-tools');

export const config = {
  glossaryPath: process.env.FRONTDRIVE_GLOSSARY ?? path.join(GLOSSARY_DIR, 'glossary.json'),
  overlayPath: process.env.FRONTDRIVE_OVERLAY ?? path.join(GLOSSARY_DIR, 'overlay.json'),
  /** Корень репозитория UI-KIT, чтобы резолвить относительные source-пути стори. */
  storybookRoot: process.env.FRONTDRIVE_STORYBOOK_ROOT ?? null,
};

/** Загружает glossary.json и мерджит overlay.json в карточки. */
export function loadCards(): ComponentCard[] {
  const glossary = JSON.parse(fs.readFileSync(config.glossaryPath, 'utf8')) as {
    components: GlossaryComponent[];
  };
  const overlay = fs.existsSync(config.overlayPath)
    ? (JSON.parse(fs.readFileSync(config.overlayPath, 'utf8')).components as Record<
        string,
        OverlayEntry
      >)
    : {};

  return glossary.components.map((c) => {
    const o = overlay[c.id] ?? {};
    return {
      ...c,
      summary: o.summary ?? '',
      whenToUse: o.whenToUse ?? '',
      aliasesPixso: o.aliasesPixso ?? [],
    };
  });
}

const norm = (s: string) => s.toLowerCase().trim();

/** Поиск компонента с учётом алиасов Pixso (ACL). Возвращает ранжированный список. */
export function searchCards(
  cards: ComponentCard[],
  query: string,
  limit = 8,
): Array<{ card: ComponentCard; score: number; matchedOn: string }> {
  const q = norm(query);
  if (!q) return [];

  const scored: Array<{ card: ComponentCard; score: number; matchedOn: string }> = [];
  for (const card of cards) {
    const term = norm(card.term);
    const aliases = card.aliasesPixso.map(norm);

    let score = 0;
    let matchedOn = '';
    if (term === q) {
      score = 100;
      matchedOn = 'точное имя';
    } else if (aliases.includes(q)) {
      score = 90;
      matchedOn = 'алиас Pixso';
    } else if (term.includes(q)) {
      score = 55;
      matchedOn = 'частично по имени';
    } else if (aliases.some((a) => a.includes(q) || q.includes(a))) {
      score = 45;
      matchedOn = 'частично по алиасу';
    } else if (norm(card.summary).includes(q) || norm(card.whenToUse).includes(q)) {
      score = 25;
      matchedOn = 'по описанию';
    } else {
      const feat = card.features.find((f) => norm(f.name).includes(q));
      if (feat) {
        score = 15;
        matchedOn = `по фиче: ${feat.name}`;
      }
    }

    if (score > 0) scored.push({ card, score, matchedOn });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Точный поиск карточки по term / id / алиасу (case-insensitive). */
export function findCard(cards: ComponentCard[], name: string): ComponentCard | undefined {
  const q = norm(name);
  return (
    cards.find((c) => norm(c.term) === q) ??
    cards.find((c) => norm(c.id) === q) ??
    cards.find((c) => c.aliasesPixso.some((a) => norm(a) === q))
  );
}

const MAX_EXAMPLE_CHARS = 40_000;

/**
 * Читает исходники примеров (стори) для карточки из репозитория UI-KIT.
 * Резолвит source-пути относительно config.storybookRoot.
 * Если корень не задан или файла нет — возвращает деградированный результат.
 */
export function readExamples(card: ComponentCard): {
  ok: boolean;
  mock: boolean;
  note: string;
  files: Array<{ path: string; code: string }>;
} {
  const root = config.storybookRoot;
  if (!root) {
    return {
      ok: true,
      mock: true,
      note: 'MOCK: FRONTDRIVE_STORYBOOK_ROOT не задан — возвращена заглушка вместо реальной story.',
      files: [{ path: MOCK_EXAMPLE_PATH, code: MOCK_EXAMPLE_CODE }],
    };
  }

  // собираем кандидатов: сам компонент + source всех его фич
  const rel = new Set<string>();
  if (card.source) rel.add(card.source);
  for (const f of card.features) if (f.source) rel.add(f.source);

  const files: Array<{ path: string; code: string }> = [];
  let total = 0;
  for (const r of rel) {
    for (const abs of resolveSourceFiles(root, r)) {
      if (files.some((f) => f.path === abs)) continue;
      try {
        const code = fs.readFileSync(abs, 'utf8');
        if (total + code.length > MAX_EXAMPLE_CHARS) {
          files.push({ path: abs, code: code.slice(0, MAX_EXAMPLE_CHARS - total) + '\n/* …обрезано… */' });
          total = MAX_EXAMPLE_CHARS;
          break;
        }
        files.push({ path: abs, code });
        total += code.length;
      } catch {
        /* файла может не быть — пропускаем */
      }
    }
    if (total >= MAX_EXAMPLE_CHARS) break;
  }

  if (files.length === 0) {
    return {
      ok: true,
      mock: true,
      note: `MOCK: не нашёл исходники под ${root} — возвращена заглушка. Проверь source-пути.`,
      files: [{ path: MOCK_EXAMPLE_PATH, code: MOCK_EXAMPLE_CODE }],
    };
  }
  return { ok: true, mock: false, note: `Прочитано файлов: ${files.length}`, files };
}

/** По одному source-пути возвращает реальные файлы: сам файл + со-локейтед .stories.tsx. */
function resolveSourceFiles(root: string, relSource: string): string[] {
  const clean = relSource.replace(/^\.\//, '');
  const abs = path.resolve(root, clean);
  const out: string[] = [];
  if (fs.existsSync(abs)) out.push(abs);

  // .mdx часто только описывает — добираем реальный код из соседнего .stories.tsx
  if (/\.mdx$/.test(abs)) {
    const base = abs.replace(/\.mdx$/, '');
    for (const ext of ['.stories.tsx', '.stories.ts', '.stories.jsx']) {
      const cand = base + ext;
      if (fs.existsSync(cand)) out.push(cand);
    }
    // либо любой *.stories.* в той же папке
    const dir = path.dirname(abs);
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (/\.stories\.(tsx?|jsx?)$/.test(f)) {
          const cand = path.join(dir, f);
          if (!out.includes(cand)) out.push(cand);
        }
      }
    }
  }
  return out;
}
