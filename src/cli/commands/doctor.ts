import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadSkills } from '../../core/registry.js';
import { readManifest } from '../../core/manifest.js';
import { hashDir } from '../../core/hash.js';
import { resolveProjectPaths, readPackageInfo, DEFAULT_TARGET_DIR } from '../../core/paths.js';
import { heading, info } from '../ui.js';

export interface DoctorArgs {
  dir?: string;
}

/** Диагностика состояния проекта. Возвращает код выхода (0 — всё чисто). */
export function doctorCommand(args: DoctorArgs): number {
  const pkg = readPackageInfo();
  const paths = resolveProjectPaths(process.cwd(), args.dir ?? DEFAULT_TARGET_DIR);
  const manifest = readManifest(paths.manifestPath);
  const skills = loadSkills();

  heading('frontdrive-tools doctor');
  const problems: string[] = [];

  if (!manifest) {
    info(pc.yellow('  Манифест не найден — проект ещё не инициализирован. Запусти `init`.'));
    return 1;
  }

  info(`  Пакет: ${pkg.name}@${pkg.version}`);
  info(`  Установлено из версии: ${manifest.packageVersion}`);
  if (manifest.packageVersion !== pkg.version) {
    problems.push(`версия пакета (${pkg.version}) новее установленной (${manifest.packageVersion}) — запусти \`update\`.`);
  }

  const skillNames = new Set(skills.map((s) => s.name));

  for (const s of skills) {
    const dest = path.join(paths.skillsDir, s.name);
    const installed = manifest.skills[s.name];
    if (!installed || !fs.existsSync(dest)) {
      problems.push(`скилл "${s.name}" доступен в пакете, но не установлен.`);
      continue;
    }
    if (installed.version !== s.version) {
      problems.push(`скилл "${s.name}": установлена v${installed.version}, в пакете v${s.version}.`);
    }
    if (hashDir(dest) !== installed.hash) {
      problems.push(`скилл "${s.name}" изменён вручную в проекте (хэш не совпадает).`);
    }
  }

  for (const name of Object.keys(manifest.skills)) {
    if (!skillNames.has(name)) {
      problems.push(`скилл "${name}" установлен, но его больше нет в пакете.`);
    }
  }

  if (!fs.existsSync(paths.agentsPath)) {
    problems.push('AGENTS.md отсутствует.');
  }

  if (problems.length === 0) {
    info(pc.green('  Всё в порядке.'));
    return 0;
  }
  for (const p of problems) info(pc.yellow(`  ! ${p}`));
  return 1;
}
