import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { skillsSourceDir } from './paths.js';
import type { SkillMeta } from '../types.js';

/**
 * Реестр всех скиллов пакета. Строится динамически: сканирует assets/skills,
 * читает фронт-маттер каждого SKILL.md. Чтобы добавить скилл — достаточно
 * создать новую папку с SKILL.md, регистрировать вручную ничего не нужно.
 */
export function loadSkills(): SkillMeta[] {
  const root = skillsSourceDir();
  if (!fs.existsSync(root)) return [];

  const skills: SkillMeta[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const skillFile = path.join(dir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    const { data } = matter(fs.readFileSync(skillFile, 'utf8'));
    skills.push({
      name: (data.name as string) ?? entry.name,
      version: (data.version as string) ?? '0.0.0',
      description: (data.description as string) ?? '',
      dir,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function findSkill(name: string): SkillMeta | undefined {
  return loadSkills().find((s) => s.name === name);
}
