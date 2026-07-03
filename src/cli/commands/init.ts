import { syncSkills } from '../../core/sync.js';
import { heading, info, statusLabel, success, warn } from '../ui.js';

export interface InitArgs {
  dir?: string;
  force?: boolean;
}

export function initCommand(args: InitArgs): void {
  const root = process.cwd();
  heading('frontdrive-tools init');
  const result = syncSkills(root, { targetDir: args.dir, force: args.force });

  if (result.results.length === 0) {
    warn('В пакете не найдено ни одного скилла.');
  } else {
    for (const r of result.results) {
      info(`  ${r.name} (v${r.version}) — ${statusLabel(r.status)}`);
    }
  }

  for (const name of result.orphaned) {
    warn(`Скилл "${name}" остался в проекте, но его больше нет в пакете (удали вручную при необходимости).`);
  }

  success(`AGENTS.md обновлён: ${result.agentsPath}`);
  success(`Манифест: ${result.manifestPath}`);
}
