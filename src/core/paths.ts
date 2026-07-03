import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

/** Корень установленного пакета (там, где лежит package.json и assets). */
export function packageRoot(): string {
  // Скомпилировано в dist/core/paths.js → поднимаемся на два уровня до корня пакета.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..');
}

/** Директория с ассетами, которые раскатываются в проекты. */
export function assetsDir(): string {
  return path.join(packageRoot(), 'assets');
}

/** Директория-источник скиллов внутри пакета. */
export function skillsSourceDir(): string {
  return path.join(assetsDir(), 'skills');
}

/** Версия и имя пакета из его package.json. */
export function readPackageInfo(): { name: string; version: string } {
  const pkgPath = path.join(packageRoot(), 'package.json');
  const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    name: string;
    version: string;
  };
  return { name: raw.name, version: raw.version };
}

/** Настройки размещения в проекте-потребителе. */
export const DEFAULT_TARGET_DIR = '.ai';
export const AGENTS_FILE = 'AGENTS.md';
export const MANIFEST_FILE = 'manifest.json';

export interface ProjectPaths {
  root: string;
  targetDir: string;
  skillsDir: string;
  manifestPath: string;
  agentsPath: string;
}

export function resolveProjectPaths(
  root: string,
  targetDir: string = DEFAULT_TARGET_DIR,
): ProjectPaths {
  const target = path.join(root, targetDir);
  return {
    root,
    targetDir,
    skillsDir: path.join(target, 'skills'),
    manifestPath: path.join(target, MANIFEST_FILE),
    agentsPath: path.join(root, AGENTS_FILE),
  };
}
