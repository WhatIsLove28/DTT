import { describe, expect, it } from 'vitest'
import { generateForWeek } from './generate'
import { goalProgress, goalStatus } from './goalProgress'
import { makeDone, makeGoal, makeTask } from './testFactories'
import type { Task, TaskStatus, WeeklyGoal } from './types'

const WEEK = '2026-11-09'

/** Сгенерированные задачи цели на неделю с заданными статусами по датам */
function weekTasks(goal: WeeklyGoal, statuses: Record<string, TaskStatus> = {}, week = WEEK): Task[] {
  return generateForWeek(week, { goals: [goal], series: [], existingTaskIds: new Set() }).map((t) => {
    const status = statuses[t.date] ?? 'todo'
    return status === 'done' ? { ...t, status, completedAt: `${t.date}T12:00:00` } : { ...t, status }
  })
}

describe('goalProgress — количество', () => {
  it('считает выполненные задачи цели за неделю', () => {
    const goal = makeGoal()
    const tasks = weekTasks(goal, { '2026-11-09': 'done', '2026-11-11': 'done' })
    expect(goalProgress(goal, WEEK, tasks)).toMatchObject({ done: 2, value: 2, achieved: false })
  })

  it('ручная задача, привязанная к цели, увеличивает прогресс; чужие — нет', () => {
    const goal = makeGoal()
    const tasks = [
      makeDone({ id: 'm1', goalId: 'g1', date: '2026-11-10' }),
      makeDone({ id: 'm2', goalId: 'other', date: '2026-11-10' }),
      makeDone({ id: 'm3', date: '2026-11-10' }),
    ]
    expect(goalProgress(goal, WEEK, tasks).done).toBe(1)
  })

  it('засчитывается по фактическому дню: понедельничная задача, сделанная в следующий вторник', () => {
    const goal = makeGoal()
    const tasks = [makeDone({ id: 'm', goalId: 'g1', date: '2026-11-09', completedAt: '2026-11-17T09:00:00' })]
    expect(goalProgress(goal, WEEK, tasks).done).toBe(0)
    expect(goalProgress(goal, '2026-11-16', tasks).done).toBe(1)
  })

  it('граница недели: воскресенье 23:59 и понедельник 00:00', () => {
    const goal = makeGoal()
    const sunday = [makeDone({ id: 'a', goalId: 'g1', date: '2026-11-15', completedAt: '2026-11-15T23:59:00' })]
    const monday = [makeDone({ id: 'a', goalId: 'g1', date: '2026-11-15', completedAt: '2026-11-16T00:00:00' })]
    expect(goalProgress(goal, WEEK, sunday).done).toBe(1)
    expect(goalProgress(goal, WEEK, monday).done).toBe(0)
    expect(goalProgress(goal, '2026-11-16', monday).done).toBe(1)
  })

  it('граница года: 1 января относится к неделе с 28 декабря', () => {
    const goal = makeGoal()
    const tasks = [makeDone({ id: 'a', goalId: 'g1', date: '2027-01-01' })]
    expect(goalProgress(goal, '2026-12-28', tasks).done).toBe(1)
    expect(goalProgress(goal, '2027-01-04', tasks).done).toBe(0)
  })
})

describe('goalProgress — проценты', () => {
  const daily = makeGoal({ schedule: { type: 'daily' }, targetType: 'percent', targetValue: 80 })

  it('выполненные ÷ запланированные на неделю', () => {
    const tasks = weekTasks(daily, {
      '2026-11-09': 'done',
      '2026-11-10': 'done',
      '2026-11-11': 'skipped',
      '2026-11-12': 'done',
      '2026-11-13': 'done',
    })
    expect(goalProgress(daily, WEEK, tasks)).toMatchObject({ done: 4, planned: 7, percent: 57, value: 57 })
  })

  it('цель создана в середине недели: в плане только дни с создания', () => {
    const goal = makeGoal({ ...daily, startDate: '2026-11-12' }) // четверг → чт, пт, сб, вс
    const tasks = weekTasks(goal, { '2026-11-12': 'done', '2026-11-13': 'done', '2026-11-14': 'done' })
    expect(goalProgress(goal, WEEK, tasks)).toMatchObject({ planned: 4, percent: 75, achieved: false })
  })

  it('гибкий режим: знаменатель — timesPerWeek', () => {
    const goal = makeGoal({
      schedule: { type: 'times_per_week', timesPerWeek: 4 },
      targetType: 'percent',
      targetValue: 75,
    })
    const done = (date: string) => makeDone({ id: `g:g1:${date}`, source: 'goal', goalId: 'g1', date })
    expect(goalProgress(goal, WEEK, [done('2026-11-09')]).percent).toBe(25)
    const three = [done('2026-11-09'), done('2026-11-10'), done('2026-11-12')]
    expect(goalProgress(goal, WEEK, three)).toMatchObject({ percent: 75, achieved: true })
  })

  it('без запланированных задач — 0 %, без деления на ноль', () => {
    expect(goalProgress(daily, WEEK, [])).toMatchObject({ planned: 0, percent: 0, achieved: false })
  })
})

describe('goalStatus', () => {
  const goal = makeGoal() // пн/ср/пт, норма 3

  it('зелёный: норма выполнена', () => {
    const tasks = weekTasks(goal, { '2026-11-09': 'done', '2026-11-11': 'done', '2026-11-13': 'done' })
    expect(goalStatus(goal, WEEK, '2026-11-13', tasks)).toBe('achieved')
  })

  it('жёлтый: оставшихся задач хватает', () => {
    const tasks = weekTasks(goal, { '2026-11-09': 'done' })
    expect(goalStatus(goal, WEEK, '2026-11-11', tasks)).toBe('on_track')
  })

  it('жёлтый: просроченная с понедельника задача ещё выполнима до конца недели', () => {
    expect(goalStatus(goal, WEEK, '2026-11-12', weekTasks(goal))).toBe('on_track')
  })

  it('красный: после пропуска норму уже не набрать', () => {
    const tasks = weekTasks(goal, { '2026-11-09': 'skipped' })
    expect(goalStatus(goal, WEEK, '2026-11-10', tasks)).toBe('unreachable')
  })

  it('прошедшая неделя: зелёный или красный', () => {
    const partial = weekTasks(goal, { '2026-11-09': 'done', '2026-11-11': 'done', '2026-11-13': 'skipped' })
    expect(goalStatus(goal, WEEK, '2026-11-16', partial)).toBe('unreachable')
    const full = weekTasks(goal, { '2026-11-09': 'done', '2026-11-11': 'done', '2026-11-13': 'done' })
    expect(goalStatus(goal, WEEK, '2027-01-10', full)).toBe('achieved')
  })

  it('будущая неделя — жёлтый', () => {
    expect(goalStatus(goal, '2026-11-16', '2026-11-12', [])).toBe('on_track')
  })

  it('цель создана в четверг с нормой 3 при расписании пн/ср/пт — сразу красный', () => {
    const late = makeGoal({ startDate: '2026-11-12' })
    expect(goalStatus(late, WEEK, '2026-11-12', weekTasks(late))).toBe('unreachable')
  })

  it('цель без расписания: жёлтая до конца недели, потом красная', () => {
    const manualOnly = makeGoal({ schedule: { type: 'none' }, targetValue: 2 })
    expect(goalStatus(manualOnly, WEEK, '2026-11-15', [])).toBe('on_track')
    expect(goalStatus(manualOnly, WEEK, '2026-11-16', [])).toBe('unreachable')
  })

  it('проценты: красный, когда даже все оставшиеся не дотянут до цели', () => {
    const daily = makeGoal({ schedule: { type: 'daily' }, targetType: 'percent', targetValue: 80 })
    const oneSkipped = weekTasks(daily, { '2026-11-09': 'skipped' })
    expect(goalStatus(daily, WEEK, '2026-11-10', oneSkipped)).toBe('on_track') // максимум 6/7 = 86 %
    const twoSkipped = weekTasks(daily, { '2026-11-09': 'skipped', '2026-11-10': 'skipped' })
    expect(goalStatus(daily, WEEK, '2026-11-11', twoSkipped)).toBe('unreachable') // максимум 5/7 = 71 %
  })

  describe('гибкий режим «3 раза в неделю»', () => {
    const flex = makeGoal({ schedule: { type: 'times_per_week', timesPerWeek: 3 } })
    const row = (date: string, status: TaskStatus) =>
      status === 'done'
        ? makeDone({ id: `g:g1:${date}`, source: 'goal', goalId: 'g1', date })
        : makeTask({ id: `g:g1:${date}`, source: 'goal', goalId: 'g1', date, status })

    it('в пятницу без выполнений ещё успеть можно (пт, сб, вс)', () => {
      expect(goalStatus(flex, WEEK, '2026-11-13', [])).toBe('on_track')
    })

    it('в субботу без выполнений — уже нет', () => {
      expect(goalStatus(flex, WEEK, '2026-11-14', [])).toBe('unreachable')
    })

    it('сегодняшнее выполнение занимает сегодняшний день', () => {
      // пятница: одно сделано сегодня, остались сб и вс → 3 набирается
      expect(goalStatus(flex, WEEK, '2026-11-13', [row('2026-11-13', 'done')])).toBe('on_track')
      // суббота: одно сделано сегодня, осталось только вс → максимум 2
      expect(goalStatus(flex, WEEK, '2026-11-14', [row('2026-11-14', 'done')])).toBe('unreachable')
    })

    it('пропуск сегодня сжигает день', () => {
      expect(goalStatus(flex, WEEK, '2026-11-13', [row('2026-11-13', 'skipped')])).toBe('unreachable')
    })

    it('норма выполнена — зелёный', () => {
      const tasks = [row('2026-11-09', 'done'), row('2026-11-10', 'done'), row('2026-11-12', 'done')]
      expect(goalStatus(flex, WEEK, '2026-11-12', tasks)).toBe('achieved')
    })

    it('цель создана в субботу: двух дней на три раза не хватает', () => {
      const late = makeGoal({ ...flex, startDate: '2026-11-14' })
      expect(goalStatus(late, WEEK, '2026-11-14', [])).toBe('unreachable')
      expect(goalStatus(late, '2026-11-16', '2026-11-16', [])).toBe('on_track')
    })
  })
})
