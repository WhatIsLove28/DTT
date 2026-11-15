import { buildBackup, type BackupFile } from '../domain/backup'
import { db } from './db'
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
  return buildBackup({ categories, goals, series, tasks, meta })
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
    await metaRepo.set('initialized', true)
  })
  await runSync()
}
