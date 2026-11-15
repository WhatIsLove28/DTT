import { buildBackup, type BackupFile } from '../domain/backup'
import { CORE_TABLES, db } from './db'
import { metaRepo } from './repositories'
import { runSync } from './sync'

export const LAST_BACKUP_AT = 'lastBackupAt'

export async function exportBackup(): Promise<BackupFile> {
  const [categories, goals, series, tasks, meta] = await Promise.all([
    db.categories.toArray(),
    db.goals.toArray(),
    db.series.toArray(),
    db.tasks.toArray(),
    db.meta.toArray(),
  ])
  const core: readonly string[] = CORE_TABLES
  const modules: BackupFile['modules'] = {}
  for (const table of db.tables) {
    if (!core.includes(table.name)) modules[table.name] = await table.toArray()
  }
  return buildBackup({ categories, goals, series, tasks, meta, modules })
}

export async function markBackupDone(): Promise<void> {
  await metaRepo.set(LAST_BACKUP_AT, new Date().toISOString())
}

/** Полностью заменяет данные содержимым бэкапа, затем догенерирует пропущенные недели */
export async function importBackup(file: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.categories.bulkAdd(file.categories)
    await db.goals.bulkAdd(file.goals)
    await db.series.bulkAdd(file.series)
    await db.tasks.bulkAdd(file.tasks)
    await db.meta.bulkAdd(file.meta)
    // Таблицы модулей; раздел из более новой версии с незнакомой таблицей пропускается.
    const core: readonly string[] = CORE_TABLES
    for (const table of db.tables) {
      const rows = file.modules[table.name]
      if (rows && !core.includes(table.name)) await table.bulkAdd(rows)
    }
    await metaRepo.set('initialized', true)
  })
  await runSync()
}
