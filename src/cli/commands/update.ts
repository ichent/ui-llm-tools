import { syncSkills } from '../../core/sync.js';
import { heading, info, statusLabel, success, warn } from '../ui.js';

export interface UpdateArgs {
  dir?: string;
  force?: boolean;
}

export function updateCommand(args: UpdateArgs): void {
  const root = process.cwd();
  heading('frontdrive-tools update');
  const result = syncSkills(root, { targetDir: args.dir, force: args.force });

  const changed = result.results.filter((r) => r.status !== 'unchanged');
  if (changed.length === 0) {
    info('Всё актуально — изменений нет.');
  } else {
    for (const r of changed) {
      info(`  ${r.name} (v${r.version}) — ${statusLabel(r.status)}`);
    }
  }

  const skipped = result.results.filter((r) => r.status === 'skipped-modified');
  if (skipped.length > 0) {
    warn(`Пропущены изменённые вручную скиллы: ${skipped.map((s) => s.name).join(', ')}. Запусти с --force, чтобы перезаписать.`);
  }

  for (const name of result.orphaned) {
    warn(`Скилл "${name}" удалён из пакета, но всё ещё лежит в проекте.`);
  }

  success('Синхронизация завершена.');
}
