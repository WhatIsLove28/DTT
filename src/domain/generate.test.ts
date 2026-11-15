import { describe, expect, it } from 'vitest'
import { generateForWeek } from './generate'
import { makeGoal, makeSeries } from './testFactories'
import type { TaskSeries, WeeklyGoal } from './types'

const WEEK = '2026-11-09'
const NEXT_WEEK = '2026-11-16'

function generate(week: string, goals: WeeklyGoal[], series: TaskSeries[] = [], existing: string[] = []) {
  return generateForWeek(week, { goals, series, existingTaskIds: new Set(existing) })
}
const dates = (tasks: { date: string }[]) => tasks.map((t) => t.date)

describe('generateForWeek — цели', () => {
  it('пн/ср/пт: три задачи с полями из цели', () => {
    const goal = makeGoal({ title: 'Тренировка', defaultDurationMin: 60, defaultStartTime: '19:00' })
    const tasks = generate(WEEK, [goal])
    expect(dates(tasks)).toEqual(['2026-11-09', '2026-11-11', '2026-11-13'])
    expect(tasks[0]).toEqual({
      id: 'g:g1:2026-11-09',
      title: 'Тренировка',
      date: '2026-11-09',
      categoryId: 'c1',
      goalId: 'g1',
      source: 'goal',
      plannedDurationMin: 60,
      startTime: '19:00',
      status: 'todo',
    })
  })

  it('идемпотентна: повторный запуск не создаёт дублей', () => {
    const goal = makeGoal()
    const first = generate(WEEK, [goal])
    expect(generate(WEEK, [goal], [], first.map((t) => t.id))).toEqual([])
  })

  it('создаёт только недостающие экземпляры', () => {
    const tasks = generate(WEEK, [makeGoal()], [], ['g:g1:2026-11-09'])
    expect(dates(tasks)).toEqual(['2026-11-11', '2026-11-13'])
  })

  it('цель создана в середине недели: задачи только с дня создания', () => {
    const goal = makeGoal({ startDate: '2026-11-12' }) // четверг
    expect(dates(generate(WEEK, [goal]))).toEqual(['2026-11-13'])
    expect(dates(generate(NEXT_WEEK, [goal]))).toEqual(['2026-11-16', '2026-11-18', '2026-11-20'])
  })

  it('«через день» со старта в четверг продолжается через границу недели', () => {
    const goal = makeGoal({ schedule: { type: 'every_n_days', interval: 2 }, startDate: '2026-11-12' })
    expect(dates(generate(WEEK, [goal]))).toEqual(['2026-11-12', '2026-11-14'])
    expect(dates(generate(NEXT_WEEK, [goal]))).toEqual(['2026-11-16', '2026-11-18', '2026-11-20', '2026-11-22'])
  })

  it('цель на одну неделю без повтора не создаёт задач в следующей', () => {
    const goal = makeGoal({ repeatWeekly: false })
    expect(generate(WEEK, [goal])).toHaveLength(3)
    expect(generate(NEXT_WEEK, [goal])).toEqual([])
  })

  it('отключение повтора: после endDate задач нет', () => {
    const goal = makeGoal({ repeatWeekly: false, endDate: '2026-11-18' })
    expect(dates(generate(NEXT_WEEK, [goal]))).toEqual(['2026-11-16', '2026-11-18'])
    expect(generate('2026-11-23', [goal])).toEqual([])
  })

  it('гибкая цель (3 раза в неделю) в базу заранее не пишется', () => {
    const goal = makeGoal({ schedule: { type: 'times_per_week', timesPerWeek: 3 } })
    expect(generate(WEEK, [goal])).toEqual([])
  })

  it('неделя через границу месяца', () => {
    const goal = makeGoal({ schedule: { type: 'weekdays', weekdays: [2] } })
    expect(dates(generate('2026-11-30', [goal]))).toEqual(['2026-12-01'])
  })

  it('неделя через границу года', () => {
    const goal = makeGoal({ schedule: { type: 'daily' } })
    const tasks = generate('2026-12-28', [goal])
    expect(dates(tasks)).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ])
    expect(new Set(tasks.map((t) => t.id)).size).toBe(7)
  })
})

describe('generateForWeek — серии', () => {
  it('экземпляры серии несут seriesId и привязку к цели', () => {
    const series = makeSeries({
      recurrence: { type: 'weekdays', weekdays: [2, 4] },
      goalId: 'g1',
      startTime: '09:00',
    })
    const tasks = generate(WEEK, [], [series])
    expect(dates(tasks)).toEqual(['2026-11-10', '2026-11-12'])
    expect(tasks[0]).toMatchObject({
      id: 's:s1:2026-11-10',
      source: 'series',
      seriesId: 's1',
      goalId: 'g1',
      startTime: '09:00',
      plannedDurationMin: 15,
    })
  })

  it('серия ограничена startDate и endDate', () => {
    const series = makeSeries({ startDate: '2026-11-11', endDate: '2026-11-13' })
    expect(dates(generate(WEEK, [], [series]))).toEqual(['2026-11-11', '2026-11-12', '2026-11-13'])
  })

  it('цель и серия в один день дают две разные задачи', () => {
    const tasks = generate(WEEK, [makeGoal({ schedule: { type: 'weekdays', weekdays: [1] } })], [
      makeSeries({ recurrence: { type: 'weekdays', weekdays: [1] } }),
    ])
    expect(tasks.map((t) => t.id)).toEqual(['g:g1:2026-11-09', 's:s1:2026-11-09'])
  })
})
