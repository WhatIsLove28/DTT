import { isInWeek, weekDates, weekEndOf } from './dates'
import { goalTaskId } from './ids'
import { applyOverdueRules, isOpen } from './overdue'
import { isGoalActiveOn } from './recurrence'
import type { GoalStatus } from './statusView'
import { isDoneInWeek } from './today'
import type { ISODate, Task, WeeklyGoal } from './types'

export interface GoalProgress {
  /** Выполнено за неделю (по completedAt), любые задачи, привязанные к цели */
  done: number
  /** Запланировано на неделю — знаменатель для процентов */
  planned: number
  /** 0–100 */
  percent: number
  /** Значение в единицах цели: количество или проценты */
  value: number
  achieved: boolean
}

export function goalProgress(goal: WeeklyGoal, weekStart: ISODate, tasks: readonly Task[]): GoalProgress {
  const linked = tasks.filter((t) => t.goalId === goal.id && !t.deleted)
  const done = linked.filter((t) => isDoneInWeek(t, weekStart)).length
  // Задача, перенесённая с прошлой недели и выполненная на этой, тоже входит в план этой недели.
  const planned =
    goal.schedule.type === 'times_per_week'
      ? (goal.schedule.timesPerWeek ?? 0)
      : linked.filter((t) => isInWeek(t.date, weekStart) || isDoneInWeek(t, weekStart)).length
  const percent = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0
  const value = goal.targetType === 'count' ? done : percent
  return { done, planned, percent, value, achieved: value >= goal.targetValue }
}

/**
 * Статус цели за неделю:
 * - achieved — норма выполнена;
 * - unreachable — оставшихся возможных выполнений меньше, чем нужно (или неделя прошла);
 * - on_track — всё ещё достижимо.
 */
export function goalStatus(goal: WeeklyGoal, weekStart: ISODate, today: ISODate, tasks: readonly Task[]): GoalStatus {
  const progress = goalProgress(goal, weekStart, tasks)
  if (progress.achieved) return 'achieved'

  const weekEnd = weekEndOf(weekStart)
  if (today > weekEnd) return 'unreachable'
  if (today < weekStart) return 'on_track'
  // Цель без расписания пополняется только ручными задачами, а добавить их можно всегда.
  if (goal.schedule.type === 'none') return 'on_track'

  const willBeSkipped = new Set(applyOverdueRules(today, tasks))
  const linked = tasks.filter((t) => t.goalId === goal.id)
  const openTasks = linked.filter((t) => !t.deleted && isOpen(t) && t.date <= weekEnd && !willBeSkipped.has(t.id)).length

  let flexibleDays = 0
  if (goal.schedule.type === 'times_per_week') {
    const linkedIds = new Set(linked.map((t) => t.id))
    // Один раз в день: день свободен, если он не в прошлом и записи на него ещё нет.
    const freeDays = weekDates(weekStart).filter(
      (d) => d >= today && isGoalActiveOn(goal, d) && !linkedIds.has(goalTaskId(goal.id, d)),
    ).length
    const quotaLeft = Math.max(0, (goal.schedule.timesPerWeek ?? 0) - progress.done)
    flexibleDays = Math.min(freeDays, quotaLeft)
  }

  const maxDone = progress.done + openTasks + flexibleDays
  if (goal.targetType === 'count') {
    return maxDone < goal.targetValue ? 'unreachable' : 'on_track'
  }
  if (progress.planned === 0) return 'on_track'
  const maxPercent = Math.min(100, Math.round((maxDone / progress.planned) * 100))
  return maxPercent < goal.targetValue ? 'unreachable' : 'on_track'
}
