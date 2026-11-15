// Календарь тестов: 9 ноября 2026 — понедельник, 11-е — среда, 12-е — четверг.
import { describe, expect, it } from 'vitest'
import { goalTaskId } from './ids'
import { taskToCredit } from './goalCredit'
import { makeDone, makeGoal, makeTask } from './testFactories'
import type { Task } from './types'

const WED = '2026-11-11'
const THU = '2026-11-12'

const credit = (goal = makeGoal(), today = WED, tasks: Task[] = []) =>
  taskToCredit(goal, today, { goals: [goal], series: [], tasks }, 'Тренировка', 60, 'new')

describe('зачёт активности в цель', () => {
  it('берёт сегодняшнюю задачу цели', () => {
    const today = makeTask({ id: goalTaskId('g1', WED), date: WED, goalId: 'g1', source: 'goal' })
    expect(credit(makeGoal(), WED, [today])).toBe(today)
  })

  it('без задачи на сегодня создаёт привязанную ручную', () => {
    expect(credit(makeGoal(), THU)).toEqual({
      id: 'new',
      title: 'Тренировка',
      date: THU,
      categoryId: 'c1',
      goalId: 'g1',
      source: 'manual',
      plannedDurationMin: 60,
      status: 'todo',
    })
  })

  it('сегодняшняя задача важнее перенесённой, перенесённая — важнее новой', () => {
    const monday = makeTask({ id: goalTaskId('g1', '2026-11-09'), date: '2026-11-09', goalId: 'g1', source: 'goal' })
    const today = makeTask({ id: goalTaskId('g1', WED), date: WED, goalId: 'g1', source: 'goal' })
    expect(credit(makeGoal(), WED, [monday, today])).toBe(today)
    expect(credit(makeGoal(), THU, [monday])).toBe(monday)
  })

  it('гибкая цель: берётся виртуальная задача дня', () => {
    const goal = makeGoal({ schedule: { type: 'times_per_week', timesPerWeek: 3 } })
    expect(credit(goal, THU)).toMatchObject({ id: goalTaskId('g1', THU), source: 'goal', date: THU })
  })

  it('гибкая цель с выполненной нормой получает зачёт сверх нормы ручной задачей', () => {
    const goal = makeGoal({ schedule: { type: 'times_per_week', timesPerWeek: 1 } })
    const done = makeDone({ id: goalTaskId('g1', '2026-11-09'), date: '2026-11-09', goalId: 'g1', source: 'goal' })
    expect(credit(goal, THU, [done])).toMatchObject({ id: 'new', source: 'manual' })
  })

  it('не больше одного зачёта в день', () => {
    const done = makeDone({ id: goalTaskId('g1', WED), date: WED, goalId: 'g1', source: 'goal' })
    expect(credit(makeGoal(), WED, [done])).toBeUndefined()
  })

  it('выполненная сегодня перенесённая задача тоже считается зачётом дня', () => {
    const late = makeDone({ id: 'm1', date: '2026-11-10', goalId: 'g1', completedAt: `${WED}T09:00:00` })
    expect(credit(makeGoal(), WED, [late])).toBeUndefined()
  })

  it('чужие задачи не мешают и не подходят', () => {
    const other = makeTask({ id: 'x', date: WED, goalId: 'g2' })
    expect(credit(makeGoal(), WED, [other])).toMatchObject({ id: 'new' })
  })

  it('архивная, законченная и ещё не начавшаяся цель зачёт не получает', () => {
    expect(credit(makeGoal({ archived: true }))).toBeUndefined()
    expect(credit(makeGoal({ endDate: '2026-11-10' }))).toBeUndefined()
    expect(credit(makeGoal({ weekStart: '2026-11-16', startDate: '2026-11-16' }))).toBeUndefined()
  })

  it('пометка удаления не считается ни задачей, ни зачётом', () => {
    const removed = makeTask({ id: goalTaskId('g1', WED), date: WED, goalId: 'g1', source: 'goal', status: 'skipped', deleted: true })
    expect(credit(makeGoal(), WED, [removed])).toMatchObject({ id: 'new', source: 'manual' })
  })
})
