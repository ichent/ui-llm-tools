# Что у тебя теперь есть на руках

- glossary.json    ← машинная модель (для MCP/спеки)
- GLOSSARY.md      ← читаемый артефакт для команды и презентаций
- overlay.json     ← пустой шаблон под ручной смысл (40 записей)
- suspicious.json  ← отсев (17) — проверить глазами
- docs-only.json   ← документация (137)

# Как пользоваться

## просто глоссарий (как раньше)
node build-glossary.mjs ./storybook-static/index.json
## B: засеять overlay.json черновыми описаниями по известным компонентам
node build-glossary.mjs ./storybook-static/index.json --seed-overlay
## A: вмерджить смысл из overlay.json в glossary.json и GLOSSARY.md
node build-glossary.mjs ./storybook-static/index.json --merge-overlay
## оба сразу
node build-glossary.mjs ./storybook-static/index.json --seed-overlay --merge-overlay
## справка
node build-glossary.mjs --help

# Рекомендованный воркфлоу на проекте

1. Один раз прогнать с --seed-overlay → получить черновик.
2. Руками довести summary/whenToUse и главное — вписать aliasesPixso (это твой ACL, связь с макетами).
3. В CI гонять с --merge-overlay → glossary.json (для будущего MCP) и GLOSSARY.md (для команды) всегда актуальны.