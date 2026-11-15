import { weekStartOf, weekStartOfTimestamp } from './dates'
import { taskFromGoal, taskFromSeries } from './generate'
import { applyOverdueRules, isOverdue } from './overdue'
import { isGoalActiveOn, isSeriesActiveOn } from './recurrence'
import type { ISODate, Task, TaskSeries, WeeklyGoal } from './types'
import { displayDate } from './weekView'

export interface TodayInput {
  goals: readonly WeeklyGoal[]
  series: readonly TaskSeries[]
  tasks: readonly Task[]
}

export interface TodayItem {
  task: Task
  overdue: boolean
  /** Гибкая задача, которой ещё нет в базе: запись появится при выполнении или пропуске */
  virtual: boolean
}

/** Выполнена ли задача в неделе weekStart — по фактическому дню (completedAt) */
export function isDoneInWeek(task: Task, weekStart: ISODate): boolean {
  return task.status === 'done' && !!task.completedAt && weekStartOfTimestamp(task.completedAt) === weekStart
}

/**
 * Список «Сегодня»: задачи на сегодня, просроченные незавершённые
 * и виртуальные гибкие (times_per_week), пока недельная норма не выполнена.
 * Порядок: просроченные (старые выше), затем по времени начала, затем без времени.
 */
export function getTodayList(today: ISODate, input: TodayInput): TodayItem[] {
  const { goals, series, tasks } = input
  const week = weekStartOf(today)
  const willBeSkipped = new Set(applyOverdueRules(today, tasks))
  const existingIds = new Set(tasks.map((t) => t.id))

  const items: TodayItem[] = []
  for (const task of tasks) {
    if (task.deleted) continue
    if (task.date === today) {
      items.push({ task, overdue: false, virtual: false })
    } else if (isOverdue(task, today) && !willBeSkipped.has(task.id)) {
      items.push({ task, overdue: true, virtual: false })
    } else if (task.date < today && task.status === 'done' && displayDate(task) === today) {
      // Перенесённая задача, выполненная сегодня, остаётся в списке до конца дня.
      items.push({ task, overdue: false, virtual: false })
    }
  }

  // Гибкий режим: не больше одного выполнения в день — если запись на сегодня уже есть, не показываем.
  const addVirtual = (candidate: Task, quota: number, doneThisWeek: number) => {
    if (doneThisWeek >= quota || existingIds.has(candidate.id)) return
    items.push({ task: candidate, overdue: false, virtual: true })
  }

  for (const goal of goals) {
    if (goal.schedule.type !== 'times_per_week' || !isGoalActiveOn(goal, today)) continue
    const done = tasks.filter((t) => !t.deleted && t.goalId === goal.id && isDoneInWeek(t, week)).length
    addVirtual(taskFromGoal(goal, today), goal.schedule.timesPerWeek ?? 0, done)
  }
  for (const s of series) {
    if (s.recurrence.type !== 'times_per_week' || !isSeriesActiveOn(s, today)) continue
    const done = tasks.filter((t) => !t.deleted && t.seriesId === s.id && isDoneInWeek(t, week)).length
    addVirtual(taskFromSeries(s, today), s.recurrence.timesPerWeek ?? 0, done)
  }

  return items.sort(compareTodayItems)
}

function compareTodayItems(a: TodayItem, b: TodayItem): number {
  if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
  if (a.overdue && a.task.date !== b.task.date) return a.task.date < b.task.date ? -1 : 1
  const at = a.task.startTime
  const bt = b.task.startTime
  if (at && bt) return at < bt ? -1 : at > bt ? 1 : 0
  if (at || bt) return at ? -1 : 1
  return 0
}
