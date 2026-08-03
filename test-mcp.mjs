import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['bin/frontdrive-mcp.js'],
});
const client = new Client({ name: 'gen-demo', version: '0.0.0' });
await client.connect(transport);

const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const out = r.content.map((c) => c.text).join('\n');
  console.log(`\n>>> ${name}(${JSON.stringify(args)})`);
  console.log(out);
  return out;
};

// Пайплайн генерации модалки "создание проекта":
// 1) в макете Pixso элемент может называться "Popup" — резолвим через ACL
await call('search_components', { query: 'Popup' });
// 2) берём карточку канонического компонента
await call('get_component', { name: 'ModalDF' });
// 3) берём код примера для заземления (сейчас мок)
await call('get_examples', { name: 'ModalDF' });

await client.close();
