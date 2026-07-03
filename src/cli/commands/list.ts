import pc from 'picocolors';
import { loadSkills } from '../../core/registry.js';
import { readManifest } from '../../core/manifest.js';
import { resolveProjectPaths, readPackageInfo, DEFAULT_TARGET_DIR } from '../../core/paths.js';
import { heading, info } from '../ui.js';

export interface ListArgs {
  dir?: string;
}

export function listCommand(args: ListArgs): void {
  const pkg = readPackageInfo();
  const skills = loadSkills();
  const paths = resolveProjectPaths(process.cwd(), args.dir ?? DEFAULT_TARGET_DIR);
  const manifest = readManifest(paths.manifestPath);

  heading(`${pkg.name}@${pkg.version} — доступные skills`);
  if (skills.length === 0) {
    info('  (пусто)');
    return;
  }

  for (const s of skills) {
    const installed = manifest?.skills[s.name];
    let state: string;
    if (!installed) state = pc.dim('не установлен');
    else if (installed.version !== s.version)
      state = pc.cyan(`обновление: ${installed.version} → ${s.version}`);
    else if (installed.modifiedByUser) state = pc.yellow('изменён вручную');
    else state = pc.green(`установлен v${installed.version}`);

    info(`  ${pc.bold(s.name)} — ${s.description}`);
    info(`      версия в пакете: v${s.version} · ${state}`);
  }
}
