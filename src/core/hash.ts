import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Все файлы директории рекурсивно, отсортированные по относительному пути. */
function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Стабильный хэш содержимого директории: учитывает относительные пути и байты
 * файлов, не зависит от порядка обхода ФС.
 */
export function hashDir(dir: string): string {
  const hash = crypto.createHash('sha256');
  for (const file of listFiles(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/');
    hash.update(rel);
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}
