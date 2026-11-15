import { weekDates } from './dates'
import { goalTaskId, seriesTaskId } from './ids'
import { isGoalActiveOn, isScheduledOn, isSeriesActiveOn } from './recurrence'
import type { ISODate, Task, TaskSeries, WeeklyGoal } from './types'

export interface GenerateInput {
  goals: readonly WeeklyGoal[]
  series: readonly TaskSeries[]
  /** id задач, которые уже есть в базе */
  existingTaskIds: ReadonlySet<string>
}

export function taskFromGoal(goal: WeeklyGoal, date: ISODate): Task {
  return {
    id: goalTaskId(goal.id, date),
    title: goal.title,
    date,
    categoryId: goal.categoryId,
    goalId: goal.id,
    source: 'goal',
    plannedDurationMin: goal.defaultDurationMin,
    startTime: goal.defaultStartTime,
    status: 'todo',
  }
}

export function taskFromSeries(series: TaskSeries, date: ISODate): Task {
  return {
    id: seriesTaskId(series.id, date),
    title: series.title,
    date,
    categoryId: series.categoryId,
    goalId: series.goalId,
    seriesId: series.id,
    source: 'series',
    plannedDurationMin: series.plannedDurationMin,
    startTime: series.startTime,
    status: 'todo',
  }
}

/**
 * Недостающие экземпляры задач на неделю из целей и серий с фиксированным расписанием.
 * Идемпотентна: то, что уже есть в existingTaskIds, повторно не создаётся.
 * Гибкие (times_per_week) здесь не создаются — они виртуальные, см. getTodayList.
 */
export function generateForWeek(weekStart: ISODate, input: GenerateInput): Task[] {
  const created: Task[] = []
  for (const date of weekDates(weekStart)) {
    for (const goal of input.goals) {
      if (!isGoalActiveOn(goal, date) || !isScheduledOn(goal.schedule, goal.startDate, date)) continue
      const task = taskFromGoal(goal, date)
      if (!input.existingTaskIds.has(task.id)) created.push(task)
    }
    for (const series of input.series) {
      if (!isSeriesActiveOn(series, date) || !isScheduledOn(series.recurrence, series.startDate, date)) continue
      const task = taskFromSeries(series, date)
      if (!input.existingTaskIds.has(task.id)) created.push(task)
    }
  }
  return created
}
