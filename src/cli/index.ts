import { Command } from 'commander';
import { readPackageInfo } from '../core/paths.js';
import { initCommand } from './commands/init.js';
import { updateCommand } from './commands/update.js';
import { listCommand } from './commands/list.js';
import { doctorCommand } from './commands/doctor.js';

export async function run(argv: string[]): Promise<void> {
  const pkg = readPackageInfo();
  const program = new Command();

  program
    .name('frontdrive-tools')
    .description('CLI для раскатки AI-скиллов пакета в проект-потребитель.')
    .version(pkg.version, '-v, --version');

  program
    .command('init')
    .description('Первичная установка скиллов в проект (создаёт .ai/, AGENTS.md, манифест).')
    .option('-d, --dir <dir>', 'директория установки внутри проекта')
    .option('-f, --force', 'перезаписать даже изменённые вручную скиллы', false)
    .action((opts) => initCommand(opts));

  program
    .command('update')
    .description('Синхронизировать проект до версии установленного пакета.')
    .option('-d, --dir <dir>', 'директория установки внутри проекта')
    .option('-f, --force', 'перезаписать даже изменённые вручную скиллы', false)
    .action((opts) => updateCommand(opts));

  program
    .command('list')
    .description('Показать доступные скиллы и их состояние в проекте.')
    .option('-d, --dir <dir>', 'директория установки внутри проекта')
    .action((opts) => listCommand(opts));

  program
    .command('doctor')
    .description('Проверить целостность установки (устаревшее, ручные правки, пропуски).')
    .option('-d, --dir <dir>', 'директория установки внутри проекта')
    .action((opts) => {
      const code = doctorCommand(opts);
      if (code !== 0) process.exitCode = code;
    });

  await program.parseAsync(argv);
}
