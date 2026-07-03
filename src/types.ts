/** Метаданные скилла, прочитанные из фронт-маттера SKILL.md внутри пакета. */
export interface SkillMeta {
  /** Уникальное имя скилла (совпадает с именем папки). */
  name: string;
  /** Semver конкретного скилла (независимо от версии пакета). */
  version: string;
  /** Короткое описание для списков и AGENTS.md. */
  description: string;
  /** Абсолютный путь к папке скилла внутри assets пакета. */
  dir: string;
}

/** Запись об установленном в проект скилле (хранится в манифесте проекта). */
export interface InstalledSkill {
  version: string;
  /** Хэш содержимого папки скилла на момент установки/обновления. */
  hash: string;
  /** true, если файлы скилла в проекте были изменены вручную. */
  modifiedByUser: boolean;
}

/** Манифест, который CLI кладёт в проект-потребитель. */
export interface Manifest {
  packageName: string;
  packageVersion: string;
  installedAt: string;
  /** Относительный путь директории со скиллами внутри проекта. */
  targetDir: string;
  skills: Record<string, InstalledSkill>;
}
