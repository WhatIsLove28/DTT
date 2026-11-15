import { daysBetween, isoWeekday, weekEndOf } from './dates'
import type { ISODate, Recurrence, TaskSeries, WeeklyGoal } from './types'

/**
 * Выпадает ли фиксированное расписание на дату.
 * Гибкий режим (times_per_week) и отсутствие повтора (none) фиксированных дней не имеют.
 */
export function isScheduledOn(recurrence: Recurrence, startDate: ISODate, date: ISODate): boolean {
  if (date < startDate) return false
  switch (recurrence.type) {
    case 'daily':
      return true
    case 'every_n_days': {
      const interval = Math.max(1, recurrence.interval ?? 1)
      return daysBetween(startDate, date) % interval === 0
    }
    case 'weekdays':
      return (recurrence.weekdays ?? []).includes(isoWeekday(date))
    case 'none':
    case 'times_per_week':
      return false
  }
}

/**
 * Действует ли цель в указанный день.
 * Цель без повтора живёт только до конца недели создания;
 * endDate (отключение повтора) обрезает всё, что позже.
 */
export function isGoalActiveOn(goal: WeeklyGoal, date: ISODate): boolean {
  if (date < goal.startDate) return false
  if (goal.endDate) return date <= goal.endDate
  return goal.repeatWeekly || date <= weekEndOf(goal.weekStart)
}

/** Показывать ли цель в неделе: достаточно одного действующего дня */
export function isGoalActiveInWeek(goal: WeeklyGoal, weekStart: ISODate): boolean {
  const weekEnd = weekEndOf(weekStart)
  if (weekEnd < goal.startDate) return false
  const firstDay = weekStart > goal.startDate ? weekStart : goal.startDate
  return isGoalActiveOn(goal, firstDay)
}

export function isSeriesActiveOn(series: TaskSeries, date: ISODate): boolean {
  return date >= series.startDate && (!series.endDate || date <= series.endDate)
}
