import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  loadCards,
  searchCards,
  findCard,
  readExamples,
  config,
  type ComponentCard,
} from './data.js';

/** Текстовый content для ответа тула. */
const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

/** Человекочитаемая карточка компонента для LLM. */
function renderCard(c: ComponentCard): string {
  const lines: string[] = [];
  lines.push(`# ${c.term}  (${c.kind === 'aggregate' ? 'агрегат' : 'компонент'})`);
  lines.push(`Категория: ${c.group}`);
  if (c.summary) lines.push(`Что это: ${c.summary}`);
  if (c.whenToUse) lines.push(`Когда использовать: ${c.whenToUse}`);
  if (c.aliasesPixso.length) lines.push(`Имена в Pixso (ACL): ${c.aliasesPixso.join(', ')}`);
  if (c.source) lines.push(`Источник: ${c.source}`);
  if (c.stories.length) lines.push(`\nПримеры (stories): ${c.stories.join(', ')}`);
  if (c.features.length) {
    lines.push(`\nФичи агрегата (${c.features.length}):`);
    for (const f of c.features) lines.push(`  - ${f.name} (${f.examples} прим.)`);
  }
  lines.push(
    `\nЧтобы увидеть КОД примеров — вызови get_examples("${c.term}") ` +
      `(нужен исходник UI-KIT через FRONTDRIVE_STORYBOOK_ROOT).`,
  );
  return lines.join('\n');
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'frontdrive-glossary',
    version: '0.1.0',
  });

  // 1) Поиск компонента — вход в ACL: имя из Pixso -> канонический компонент UI-KIT
  server.registerTool(
    'search_components',
    {
      title: 'Найти компонент UI-KIT',
      description:
        'Ищет компонент дизайн-системы по имени, алиасу из Pixso, описанию или фиче. ' +
        'Используй это ПЕРВЫМ, когда в макете элемент назван не так, как в UI-KIT ' +
        '(напр. в Pixso «Popup» → канонический «ModalDF»).',
      inputSchema: {
        query: z.string().describe('Имя/алиас/ключевое слово, напр. "модалка", "Popup", "поиск"'),
        limit: z.number().int().min(1).max(20).optional().describe('Сколько результатов (по умолч. 8)'),
      },
    },
    async ({ query, limit }) => {
      const cards = loadCards();
      const hits = searchCards(cards, query, limit ?? 8);
      if (hits.length === 0) return text(`Ничего не найдено по «${query}».`);
      const body = hits
        .map(
          (h, i) =>
            `${i + 1}. ${h.card.term} [${h.card.group}] — ${h.matchedOn}` +
            (h.card.summary ? `\n   ${h.card.summary}` : ''),
        )
        .join('\n');
      return text(`Найдено по «${query}»:\n${body}\n\nДалее: get_component("<имя>") за карточкой.`);
    },
  );

  // 2) Карточка компонента — модель + семантика (для «что это и как устроено»)
  server.registerTool(
    'get_component',
    {
      title: 'Карточка компонента',
      description:
        'Возвращает карточку компонента UI-KIT: описание, когда использовать, ' +
        'алиасы Pixso, список примеров и (для агрегатов) фичи.',
      inputSchema: {
        name: z.string().describe('Каноническое имя компонента (term) или его id/алиас'),
      },
    },
    async ({ name }) => {
      const cards = loadCards();
      const card = findCard(cards, name);
      if (!card) {
        const hits = searchCards(cards, name, 5);
        const hint = hits.length
          ? `\nВозможно ты имел в виду: ${hits.map((h) => h.card.term).join(', ')}`
          : '';
        return text(`Компонент «${name}» не найден.${hint}`);
      }
      return text(renderCard(card));
    },
  );

  // 3) Код примеров — заземление LLM на реальный API компонента (grounding)
  server.registerTool(
    'get_examples',
    {
      title: 'Код примеров использования',
      description:
        'Возвращает РЕАЛЬНЫЙ код примеров (stories) компонента из репозитория UI-KIT. ' +
        'Это главный источник правды по API/пропсам — опирайся на него при генерации кода, ' +
        'а не на догадки. Требует FRONTDRIVE_STORYBOOK_ROOT.',
      inputSchema: {
        name: z.string().describe('Каноническое имя компонента (term) или его id/алиас'),
      },
    },
    async ({ name }) => {
      const cards = loadCards();
      const card = findCard(cards, name);
      if (!card) return text(`Компонент «${name}» не найден.`);

      const res = readExamples(card);
      const banner = res.mock
        ? `⚠️ ${res.note}\nЭто ВРЕМЕННАЯ заглушка одинаковая для всех компонентов. ` +
          `Задай FRONTDRIVE_STORYBOOK_ROOT, чтобы получать реальные примеры «${card.term}».`
        : res.note;
      const body = res.files
        .map((f) => `\n// ===== ${f.path} =====\n${f.code}`)
        .join('\n');
      return text(`${banner}\n${body}`);
    },
  );

  // 4) Список компонентов — обзор всей дизайн-системы
  server.registerTool(
    'list_components',
    {
      title: 'Список компонентов дизайн-системы',
      description: 'Перечисляет компоненты UI-KIT, опционально фильтруя по категории.',
      inputSchema: {
        category: z.string().optional().describe('Фильтр по категории (напр. "Композиции")'),
      },
    },
    async ({ category }) => {
      const cards = loadCards();
      const filtered = category
        ? cards.filter((c) => c.group.toLowerCase().includes(category.toLowerCase()))
        : cards;
      if (filtered.length === 0) return text('Ничего не найдено.');

      const byGroup = new Map<string, ComponentCard[]>();
      for (const c of filtered) {
        if (!byGroup.has(c.group)) byGroup.set(c.group, []);
        byGroup.get(c.group)!.push(c);
      }
      const out: string[] = [`Компонентов: ${filtered.length}`];
      for (const [g, list] of byGroup) {
        out.push(`\n## ${g} (${list.length})`);
        for (const c of list.sort((a, b) => a.term.localeCompare(b.term))) {
          out.push(`- ${c.term}${c.summary ? ` — ${c.summary}` : ''}`);
        }
      }
      return text(out.join('\n'));
    },
  );

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // лог в stderr, чтобы не мешать stdio-протоколу
  console.error(
    `[frontdrive-glossary] MCP запущен. glossary=${config.glossaryPath} ` +
      `storybookRoot=${config.storybookRoot ?? '(не задан)'}`,
  );
}
