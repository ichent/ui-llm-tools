# @frontdrive/ui-llm-tools

Внутренний фреймворк AI-тулинга для frontend-команд. Пакет доставляет **skills**
(инструкции для LLM/агента) в проекты-потребители через CLI-генератор.

Модель распространения — **sync**: CLI копирует скиллы в проект (`.ai/skills/…`)
и поддерживает управляемый блок в `AGENTS.md`, откуда внутренняя LLM их читает.

## Установка в проект-потребитель

```bash
npm i -D @frontdrive/ui-llm-tools
npx frontdrive-tools init
```

После этого в проекте появятся:

```
.ai/
  skills/
    commit/SKILL.md
    pr-description/SKILL.md
  manifest.json        # что и какой версии установлено
AGENTS.md              # с управляемым блоком со списком скиллов
```

## Обновление

```bash
npm update @frontdrive/ui-llm-tools
npx frontdrive-tools update      # синхронизация до версии пакета
```

Обновление идемпотентно и не трогает скиллы, изменённые вручную (о них
предупредит). Перезаписать принудительно: `--force`.

## Команды

| Команда   | Назначение                                                        |
| --------- | ----------------------------------------------------------------- |
| `init`    | Первичная раскатка скиллов, создание `.ai/`, `AGENTS.md`, манифеста |
| `update`  | Синхронизация проекта до версии установленного пакета             |
| `list`    | Доступные скиллы и их состояние в проекте                         |
| `doctor`  | Диагностика: устаревшее, ручные правки, пропуски                  |

Флаги: `-d, --dir <dir>` — сменить директорию установки (по умолчанию `.ai`);
`-f, --force` — перезаписать изменённые вручную скиллы.

## Как добавить новый скилл

1. Создай папку `assets/skills/<имя>/` с файлом `SKILL.md`.
2. Заполни фронт-маттер:

```markdown
---
name: my-skill
version: 1.0.0
description: Короткое описание для списков и AGENTS.md.
---

# Skill: my-skill
...
```

3. Подними версию пакета (semver), опубликуй. Реестр скиллов строится
   автоматически из фронт-маттера — регистрировать вручную ничего не нужно.

## MCP-сервер: заземление LLM на UI-KIT

Пакет содержит MCP-сервер `frontdrive-mcp`, который отдаёт LLM (в Cursor)
**карточки компонентов** из `glossary.json` и **реальный код примеров** из
Storybook. Это убирает галлюцинации по API: модель генерит компоненты, опираясь
на фактические stories, а не на догадки.

### Тулы

| Тул                 | Назначение                                                                 |
| ------------------- | -------------------------------------------------------------------------- |
| `search_components` | Поиск по имени/алиасу Pixso/описанию/фиче (вход в ACL: «Popup» → `ModalDF`) |
| `get_component`     | Карточка: описание, когда использовать, алиасы, примеры, фичи агрегата      |
| `get_examples`      | Реальный код stories компонента из репозитория UI-KIT (grounding)          |
| `list_components`   | Обзор дизайн-системы, опц. фильтр по категории                             |

### Конфигурация (env)

| Переменная                   | По умолчанию                        | Назначение                              |
| ---------------------------- | ----------------------------------- | --------------------------------------- |
| `FRONTDRIVE_GLOSSARY_DIR`    | `<пакет>/glossary-tools`            | Папка с `glossary.json` и `overlay.json` |
| `FRONTDRIVE_GLOSSARY`        | `<DIR>/glossary.json`               | Путь к глоссарию напрямую                |
| `FRONTDRIVE_OVERLAY`         | `<DIR>/overlay.json`                | Путь к overlay напрямую                 |
| `FRONTDRIVE_STORYBOOK_ROOT`  | —                                   | Корень репозитория UI-KIT (для `get_examples`) |

### Подключение в Cursor

Пропиши в `.cursor/mcp.json` проекта (или в `~/.cursor/mcp.json` глобально):

```json
{
  "mcpServers": {
    "frontdrive-glossary": {
      "command": "node",
      "args": ["<путь>/ui-llm-tools/bin/frontdrive-mcp.js"],
      "env": { "FRONTDRIVE_STORYBOOK_ROOT": "<путь к репозиторию UI-KIT>" }
    }
  }
}
```

Без `FRONTDRIVE_STORYBOOK_ROOT` сервер работает, но `get_examples` отдаёт только
имена stories и пути (без кода).

## Разработка

```bash
npm install
npm run build      # компиляция TS → dist/
node bin/frontdrive-tools.js list
```

## Публикация во внутренний registry

Пакет приватный (`"private": true`, `publishConfig.access: restricted`).
Перед публикацией укажи внутренний реестр в `publishConfig.registry` и сними
`private`, затем `npm publish`. В npm-пакет попадают только `bin/`, `dist/`,
`assets/` (см. поле `files`).
