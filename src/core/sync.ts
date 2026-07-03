import fs from 'node:fs';
import path from 'node:path';
import { hashDir } from './hash.js';
import { loadSkills } from './registry.js';
import { readManifest, writeManifest } from './manifest.js';
import { upsertManagedBlock } from './markers.js';
import {
  AGENTS_FILE,
  DEFAULT_TARGET_DIR,
  readPackageInfo,
  resolveProjectPaths,
} from './paths.js';
import type { InstalledSkill, Manifest, SkillMeta } from '../types.js';

export type SkillStatus =
  | 'added'
  | 'updated'
  | 'refreshed'
  | 'unchanged'
  | 'skipped-modified';

export interface SkillResult {
  name: string;
  version: string;
  status: SkillStatus;
}

export interface SyncResult {
  results: SkillResult[];
  /** Скиллы, что есть в проекте, но которых больше нет в пакете. */
  orphaned: string[];
  agentsPath: string;
  manifestPath: string;
}

export interface SyncOptions {
  targetDir?: string;
  /** Перезаписать даже те скиллы, что были изменены вручную. */
  force?: boolean;
}

function copyDirClean(src: string, dest: string): void {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

function buildAgentsBlock(skills: SkillMeta[], targetDir: string): string {
  const lines = [
    '## AI skills (управляется пакетом, не редактировать вручную)',
    '',
    'Ниже — навыки, доступные агенту в этом проекте. Используй соответствующий',
    'skill, когда задача подходит под его назначение.',
    '',
  ];
  if (skills.length === 0) {
    lines.push('_Пока не установлено ни одного скилла._');
  } else {
    for (const s of skills) {
      const ref = `${targetDir}/skills/${s.name}/SKILL.md`;
      lines.push(`- **${s.name}** (v${s.version}) — ${s.description} См. \`${ref}\`.`);
    }
  }
  return lines.join('\n');
}

/**
 * Раскатывает/обновляет скиллы пакета в проекте, обновляет AGENTS.md и манифест.
 * Идемпотентна: повторный запуск без изменений в пакете ничего не меняет.
 */
export function syncSkills(projectRoot: string, options: SyncOptions = {}): SyncResult {
  const targetDir = options.targetDir ?? DEFAULT_TARGET_DIR;
  const paths = resolveProjectPaths(projectRoot, targetDir);
  const pkg = readPackageInfo();
  const skills = loadSkills();
  const prevManifest = readManifest(paths.manifestPath);

  fs.mkdirSync(paths.skillsDir, { recursive: true });

  const results: SkillResult[] = [];
  const nextSkills: Manifest['skills'] = {};

  for (const skill of skills) {
    const dest = path.join(paths.skillsDir, skill.name);
    const srcHash = hashDir(skill.dir);
    const prev = prevManifest?.skills[skill.name];
    const destExists = fs.existsSync(dest);

    if (destExists && prev) {
      const curHash = hashDir(dest);
      const userModified = curHash !== prev.hash;

      if (userModified && !options.force) {
        results.push({ name: skill.name, version: prev.version, status: 'skipped-modified' });
        nextSkills[skill.name] = { ...prev, modifiedByUser: true } as InstalledSkill;
        continue;
      }

      if (!userModified && curHash === srcHash) {
        results.push({ name: skill.name, version: skill.version, status: 'unchanged' });
        nextSkills[skill.name] = { version: skill.version, hash: srcHash, modifiedByUser: false };
        continue;
      }
    }

    copyDirClean(skill.dir, dest);
    nextSkills[skill.name] = { version: skill.version, hash: srcHash, modifiedByUser: false };

    let status: SkillStatus = 'added';
    if (prev) status = prev.version !== skill.version ? 'updated' : 'refreshed';
    results.push({ name: skill.name, version: skill.version, status });
  }

  const currentNames = new Set(skills.map((s) => s.name));
  const orphaned = prevManifest
    ? Object.keys(prevManifest.skills).filter((name) => !currentNames.has(name))
    : [];

  const manifest: Manifest = {
    packageName: pkg.name,
    packageVersion: pkg.version,
    installedAt: new Date().toISOString(),
    targetDir,
    skills: nextSkills,
  };
  writeManifest(paths.manifestPath, manifest);

  const existingAgents = fs.existsSync(paths.agentsPath)
    ? fs.readFileSync(paths.agentsPath, 'utf8')
    : `# ${path.basename(projectRoot)} — agent guidelines\n`;
  const block = buildAgentsBlock(skills, targetDir);
  fs.writeFileSync(paths.agentsPath, upsertManagedBlock(existingAgents, block), 'utf8');

  return {
    results,
    orphaned,
    agentsPath: path.join(projectRoot, AGENTS_FILE),
    manifestPath: paths.manifestPath,
  };
}
