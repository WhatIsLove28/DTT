import { isOpen } from './overdue'
import { isGoalActiveOn } from './recurrence'
import { getTodayList, type TodayInput } from './today'
import type { ISODate, Task, WeeklyGoal } from './types'

/**
 * Какую задачу отметить выполненной, чтобы зачесть в цель активность из модуля
 * (например, завершённую тренировку).
 * - Есть открытая задача этой цели в «Сегодня» (сегодняшняя, гибкая или перенесённая) — берётся она.
 * - Нет — создаётся ручная задача, привязанная к цели (правило привязки: её выполнение
 *   увеличивает прогресс цели).
 * - Цель не действует сегодня или сегодня в неё уже что-то засчитано — undefined:
 *   не больше одного зачёта в день.
 */
export function taskToCredit(
  goal: WeeklyGoal,
  today: ISODate,
  input: TodayInput,
  title: string,
  durationMin: number,
  newId: string,
): Task | undefined {
  if (goal.archived || !isGoalActiveOn(goal, today)) return undefined
  const doneToday = input.tasks.some(
    (t) => !t.deleted && t.goalId === goal.id && t.status === 'done' && t.completedAt?.slice(0, 10) === today,
  )
  if (doneToday) return undefined

  const open = getTodayList(today, input).filter((item) => item.task.goalId === goal.id && isOpen(item.task))
  // Сегодняшняя задача важнее перенесённой: getTodayList ставит просроченные первыми.
  const candidate = open.find((item) => !item.overdue) ?? open[0]
  if (candidate) return candidate.task

  return {
    id: newId,
    title,
    date: today,
    categoryId: goal.categoryId,
    goalId: goal.id,
    source: 'manual',
    plannedDurationMin: durationMin,
    status: 'todo',
  }
}
