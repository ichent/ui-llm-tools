import pc from 'picocolors';
import type { SkillStatus } from '../core/sync.js';

const LABELS: Record<SkillStatus, string> = {
  added: pc.green('added'),
  updated: pc.cyan('updated'),
  refreshed: pc.blue('refreshed'),
  unchanged: pc.dim('unchanged'),
  'skipped-modified': pc.yellow('skipped (изменён вручную)'),
};

export function statusLabel(status: SkillStatus): string {
  return LABELS[status];
}

export function info(msg: string): void {
  console.log(msg);
}

export function success(msg: string): void {
  console.log(pc.green(`✓ ${msg}`));
}

export function warn(msg: string): void {
  console.log(pc.yellow(`! ${msg}`));
}

export function heading(msg: string): void {
  console.log(pc.bold(msg));
}
