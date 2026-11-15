import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { FALLBACK_COLOR } from '../domain/palette'
import type { Category, Task, TaskSeries, WeeklyGoal } from '../domain/types'
import { LAST_BACKUP_AT } from './backup'
import { categoriesRepo, goalsRepo, metaRepo, seriesRepo, tasksRepo } from './repositories'

export interface AppData {
  categories: Category[]
  goals: WeeklyGoal[]
  series: TaskSeries[]
  /** Все задачи, включая пометки удаления (deleted) — доменные функции их учитывают сами */
  tasks: Task[]
  colorOf: (categoryId: string) => string
}

/** Живые данные приложения; undefined, пока база читается */
export function useAppData(): AppData | undefined {
  const raw = useLiveQuery(async () => {
    const [categories, goals, series, tasks] = await Promise.all([
      categoriesRepo.list(),
      goalsRepo.list(),
      seriesRepo.list(),
      tasksRepo.list(),
    ])
    // Id случайные, поэтому порядок задаём сами: категории и цели — по алфавиту.
    categories.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    goals.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    return { categories, goals, series, tasks }
  }, [])

  return useMemo(() => {
    if (!raw) return undefined
    const colors = new Map(raw.categories.map((c) => [c.id, c.color]))
    return { ...raw, colorOf: (id: string) => colors.get(id) ?? FALLBACK_COLOR }
  }, [raw])
}

/** Момент последнего бэкапа (ISO-строка) или undefined */
export function useLastBackupAt(): string | undefined {
  return useLiveQuery(() => metaRepo.get<string>(LAST_BACKUP_AT), [])
}
