import { weekStartOf } from './dates'
import type { ISODate, Task } from './types'

/** Незавершённая задача: ещё можно выполнить */
export function isOpen(task: Task): boolean {
  return task.status === 'todo' || task.status === 'in_progress'
}

/** Просрочена: день задачи прошёл, а она не завершена */
export function isOverdue(task: Task, today: ISODate): boolean {
  return isOpen(task) && task.date < today
}

/**
 * Id задач, которые пора перевести в skipped:
 * - задачи из недельных целей — когда их неделя закончилась;
 * - экземпляры серий — когда появился следующий экземпляр той же серии.
 * Ручные разовые задачи не пропускаются никогда: висят до выполнения.
 */
export function applyOverdueRules(today: ISODate, tasks: readonly Task[]): string[] {
  const currentWeek = weekStartOf(today)

  const latestBySeries = new Map<string, ISODate>()
  for (const t of tasks) {
    if (!t.seriesId || t.deleted || t.date > today) continue
    const latest = latestBySeries.get(t.seriesId)
    if (!latest || t.date > latest) latestBySeries.set(t.seriesId, t.date)
  }

  const toSkip: string[] = []
  for (const t of tasks) {
    if (t.deleted || !isOverdue(t, today)) continue
    if (t.source === 'goal') {
      if (t.date < currentWeek) toSkip.push(t.id)
    } else if (t.source === 'series' && t.seriesId) {
      const latest = latestBySeries.get(t.seriesId)
      if (latest && latest > t.date) toSkip.push(t.id)
    }
  }
  return toSkip
}
