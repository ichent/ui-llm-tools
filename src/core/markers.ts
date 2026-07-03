import { readPackageInfo } from './paths.js';

/**
 * Управляемый регион в AGENTS.md. CLI переписывает ТОЛЬКО содержимое между
 * маркерами; всё, что снаружи, — зона разработчика и не трогается.
 */
export function markerStart(): string {
  return `<!-- ${readPackageInfo().name}:start -->`;
}

export function markerEnd(): string {
  return `<!-- ${readPackageInfo().name}:end -->`;
}

/**
 * Вставляет/заменяет управляемый блок в тексте документа.
 * Если маркеров нет — блок добавляется в конец.
 */
export function upsertManagedBlock(source: string, block: string): string {
  const start = markerStart();
  const end = markerEnd();
  const managed = `${start}\n${block}\n${end}`;

  const startIdx = source.indexOf(start);
  const endIdx = source.indexOf(end);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = source.slice(0, startIdx);
    const after = source.slice(endIdx + end.length);
    return `${before}${managed}${after}`;
  }

  const trimmed = source.replace(/\s+$/, '');
  const prefix = trimmed.length > 0 ? `${trimmed}\n\n` : '';
  return `${prefix}${managed}\n`;
}
