// Заготовки объектов для тестов. Календарь тестов: 9 ноября 2026 — понедельник.
import type { Task, TaskSeries, WeeklyGoal } from './types'

export function makeGoal(overrides: Partial<WeeklyGoal> = {}): WeeklyGoal {
  return {
    id: 'g1',
    title: 'Цель',
    categoryId: 'c1',
    schedule: { type: 'weekdays', weekdays: [1, 3, 5] },
    targetType: 'count',
    targetValue: 3,
    defaultDurationMin: 30,
    repeatWeekly: true,
    weekStart: '2026-11-09',
    startDate: '2026-11-09',
    ...overrides,
  }
}

export function makeSeries(overrides: Partial<TaskSeries> = {}): TaskSeries {
  return {
    id: 's1',
    title: 'Серия',
    categoryId: 'c1',
    recurrence: { type: 'daily' },
    plannedDurationMin: 15,
    startDate: '2026-11-09',
    ...overrides,
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Задача',
    date: '2026-11-18',
    categoryId: 'c1',
    source: 'manual',
    plannedDurationMin: 30,
    status: 'todo',
    ...overrides,
  }
}

/** Выполненная задача; по умолчанию выполнена в свой же день в полдень */
export function makeDone(overrides: Partial<Task> = {}): Task {
  const task = makeTask({ status: 'done', ...overrides })
  return { ...task, completedAt: overrides.completedAt ?? `${task.date}T12:00:00` }
}
