import { t } from '../i18n'
import { daysBetween, toISODate } from './dates'
import type { Category, MetaEntry, Task, TaskSeries, WeeklyGoal } from './types'

export const BACKUP_APP = 'tracker'
export const BACKUP_VERSION = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  categories: Category[]
  goals: WeeklyGoal[]
  series: TaskSeries[]
  tasks: Task[]
  meta: MetaEntry[]
}

export type BackupData = Pick<BackupFile, 'categories' | 'goals' | 'series' | 'tasks' | 'meta'>

export function buildBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }
}

export function backupFileName(now: Date = new Date()): string {
  return `tracker-backup-${toISODate(now)}.json`
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function rows(value: unknown, name: string, key: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(t.backup.errNoSection(name))
  for (const row of value) {
    if (!isRecord(row) || typeof row[key] !== 'string' || row[key] === '') {
      throw new Error(t.backup.errBrokenSection(name))
    }
  }
  return value as Record<string, unknown>[]
}

/** Разбирает и проверяет файл бэкапа. Бросает Error с текстом на языке интерфейса, если файл не подходит. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error(t.backup.errNotJson)
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP) throw new Error(t.backup.errNotBackup)
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new Error(t.backup.errNewer)
  }
  const tasks = rows(raw.tasks, t.backup.sectionTasks, 'id')
  for (const row of tasks) {
    if (typeof row.date !== 'string' || typeof row.status !== 'string') throw new Error(t.backup.errBrokenSection(t.backup.sectionTasks))
  }
  return {
    app: BACKUP_APP,
    version: raw.version,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    categories: rows(raw.categories, t.backup.sectionCategories, 'id') as unknown as Category[],
    goals: rows(raw.goals, t.backup.sectionGoals, 'id') as unknown as WeeklyGoal[],
    series: rows(raw.series, t.backup.sectionSeries, 'id') as unknown as TaskSeries[],
    tasks: tasks as unknown as Task[],
    meta: rows(raw.meta ?? [], t.backup.sectionMeta, 'key') as unknown as MetaEntry[],
  }
}

/** Сколько календарных дней прошло с момента бэкапа; undefined — бэкапа не было */
export function daysSinceBackup(lastBackupAt: string | undefined, now: Date = new Date()): number | undefined {
  if (!lastBackupAt) return undefined
  const at = new Date(lastBackupAt)
  if (Number.isNaN(at.getTime())) return undefined
  return Math.max(0, daysBetween(toISODate(at), toISODate(now)))
}
