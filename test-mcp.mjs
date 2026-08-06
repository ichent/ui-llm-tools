import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = dirname(fileURLToPath(import.meta.url));

// Читаем ту же конфигурацию, что использует Cursor.
const cfg = JSON.parse(readFileSync(join(here, '.cursor', 'mcp.json'), 'utf8'));
const server = cfg.mcpServers['frontdrive-glossary'];
const configRoot = server.env?.FRONTDRIVE_STORYBOOK_ROOT ?? '';
const isPlaceholder = /ABSOLUTE\/PATH|<.*>/.test(configRoot);

// Приоритет пути: аргумент CLI > env текущего шелла > .cursor/mcp.json (если не плейсхолдер)
const root =
  process.argv[2] ||
  process.env.FRONTDRIVE_STORYBOOK_ROOT ||
  (isPlaceholder ? '' : configRoot);

console.log('FRONTDRIVE_STORYBOOK_ROOT =', root || '(не задан)');
if (!root) {
  console.log(
    'ВНИМАНИЕ: путь не задан или в .cursor/mcp.json стоит плейсхолдер — будет мок.\n' +
      'Запусти так:  node test-mcp.mjs /абсолютный/путь/к/ui-kit-репо',
  );
}

const transport = new StdioClientTransport({
  command: server.command,
  args: server.args,
  // env пробрасываем ЯВНО; реальный путь ПЕРЕБИВАЕТ плейсхолдер из конфига
  env: { ...process.env, FRONTDRIVE_STORYBOOK_ROOT: root },
});

const client = new Client({ name: 'gen-demo', version: '0.0.0' });
await client.connect(transport);

const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const out = r.content.map((c) => c.text).join('\n');
  console.log(`\n>>> ${name}(${JSON.stringify(args)})`);
  console.log(out.slice(0, 1200));
  return out;
};

await call('search_components', { query: 'Popup' });
await call('get_component', { name: 'ModalDF' });
await call('get_examples', { name: 'ModalDF' });

await client.close();
