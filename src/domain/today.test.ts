import { describe, expect, it } from 'vitest'
import { makeDone, makeGoal, makeSeries, makeTask } from './testFactories'
import { getTodayList, type TodayInput } from './today'

const TODAY = '2026-11-18' // среда, неделя с 16 ноября

function list(input: Partial<TodayInput>) {
  return getTodayList(TODAY, { goals: [], series: [], tasks: [], ...input })
}
const ids = (items: { task: { id: string } }[]) => items.map((i) => i.task.id)

const flexGoal = makeGoal({ id: 'eng', schedule: { type: 'times_per_week', timesPerWeek: 3 } })

describe('getTodayList — задачи из базы', () => {
  it('сегодняшние в любом статусе, прошлые — только незавершённые, будущих нет', () => {
    const items = list({
      tasks: [
        makeTask({ id: 'today' }),
        makeDone({ id: 'today-done' }),
        makeTask({ id: 'today-skipped', status: 'skipped' }),
        makeTask({ id: 'old-open', date: '2026-11-10' }),
        makeDone({ id: 'old-done', date: '2026-11-10' }),
        makeTask({ id: 'future', date: '2026-11-19' }),
      ],
    })
    expect(ids(items).sort()).toEqual(['old-open', 'today', 'today-done', 'today-skipped'])
    expect(items.find((i) => i.task.id === 'old-open')?.overdue).toBe(true)
    expect(items.find((i) => i.task.id === 'today')?.overdue).toBe(false)
  })

  it('задача цели с понедельника видна просроченной, с прошлой недели — нет', () => {
    const items = list({
      tasks: [
        makeTask({ id: 'this-week', source: 'goal', goalId: 'g1', date: '2026-11-16' }),
        makeTask({ id: 'last-week', source: 'goal', goalId: 'g1', date: '2026-11-13' }),
      ],
    })
    expect(ids(items)).toEqual(['this-week'])
    expect(items[0].overdue).toBe(true)
  })

  it('из серии виден только последний экземпляр', () => {
    const s = { source: 'series', seriesId: 's1' } as const
    const items = list({
      tasks: [makeTask({ ...s, id: 'tue', date: '2026-11-17' }), makeTask({ ...s, id: 'wed', date: TODAY })],
    })
    expect(ids(items)).toEqual(['wed'])
  })

  it('порядок: просроченные (старые выше), затем по времени, затем без времени', () => {
    const items = list({
      tasks: [
        makeTask({ id: 'no-time' }),
        makeTask({ id: 'evening', startTime: '19:00' }),
        makeTask({ id: 'overdue-new', date: '2026-11-17', startTime: '08:00' }),
        makeTask({ id: 'morning', startTime: '07:30' }),
        makeTask({ id: 'overdue-old', date: '2026-11-03' }),
      ],
    })
    expect(ids(items)).toEqual(['overdue-old', 'overdue-new', 'morning', 'evening', 'no-time'])
  })
})

describe('getTodayList — гибкий режим «3 раза в неделю»', () => {
  it('виртуальная задача видна, пока норма не выполнена', () => {
    const items = list({ goals: [flexGoal] })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      virtual: true,
      overdue: false,
      task: { id: 'g:eng:2026-11-18', goalId: 'eng', source: 'goal', status: 'todo', date: TODAY },
    })
  })

  it('видна после двух выполнений и скрыта после трёх', () => {
    const done = (date: string) => makeDone({ id: `g:eng:${date}`, source: 'goal', goalId: 'eng', date })
    const two = [done('2026-11-16'), done('2026-11-17')]
    expect(list({ goals: [flexGoal], tasks: two }).filter((i) => i.virtual)).toHaveLength(1)

    const three = [...two, makeDone({ id: 'manual', goalId: 'eng', date: '2026-11-17' })]
    expect(list({ goals: [flexGoal], tasks: three }).filter((i) => i.virtual)).toHaveLength(0)
  })

  it('не больше одного раза в день: после выполнения сегодня скрыта до завтра', () => {
    const tasks = [makeDone({ id: 'g:eng:2026-11-18', source: 'goal', goalId: 'eng' })]
    expect(list({ goals: [flexGoal], tasks }).filter((i) => i.virtual)).toHaveLength(0)
    expect(getTodayList('2026-11-19', { goals: [flexGoal], series: [], tasks }).filter((i) => i.virtual)).toHaveLength(1)
  })

  it('пропуск сегодня тоже скрывает задачу до завтра', () => {
    const tasks = [makeTask({ id: 'g:eng:2026-11-18', source: 'goal', goalId: 'eng', status: 'skipped' })]
    expect(list({ goals: [flexGoal], tasks }).filter((i) => i.virtual)).toHaveLength(0)
  })

  it('норма считается по неделе completedAt, а не по дате задачи', () => {
    const once = makeGoal({ id: 'eng', schedule: { type: 'times_per_week', timesPerWeek: 1 } })
    // Задача с прошлой недели, выполненная в этот понедельник, закрывает норму этой недели.
    const carried = makeDone({ id: 'm', goalId: 'eng', date: '2026-11-13', completedAt: '2026-11-16T10:00:00' })
    expect(list({ goals: [once], tasks: [carried] }).filter((i) => i.virtual)).toHaveLength(0)
    // Выполненное на прошлой неделе в норму этой недели не идёт.
    const lastWeek = makeDone({ id: 'm', goalId: 'eng', date: '2026-11-13' })
    expect(list({ goals: [once], tasks: [lastWeek] }).filter((i) => i.virtual)).toHaveLength(1)
  })

  it('новая неделя обнуляет норму', () => {
    const done = (date: string) => makeDone({ id: `g:eng:${date}`, source: 'goal', goalId: 'eng', date })
    const tasks = [done('2026-11-09'), done('2026-11-10'), done('2026-11-11')]
    expect(list({ goals: [flexGoal], tasks }).filter((i) => i.virtual)).toHaveLength(1)
  })

  it('цель на одну неделю без повтора в следующей неделе не показывается', () => {
    const oneWeek = makeGoal({ ...flexGoal, repeatWeekly: false })
    expect(list({ goals: [oneWeek] })).toEqual([])
  })

  it('цель с отключённым повтором и цель из будущего не показываются', () => {
    const ended = makeGoal({ ...flexGoal, repeatWeekly: false, endDate: '2026-11-17' })
    const future = makeGoal({ ...flexGoal, id: 'later', weekStart: '2026-11-23', startDate: '2026-11-23' })
    expect(list({ goals: [ended, future] })).toEqual([])
  })

  it('гибкая серия ведёт себя так же', () => {
    const series = makeSeries({ id: 'run', recurrence: { type: 'times_per_week', timesPerWeek: 2 }, goalId: 'g1' })
    const first = list({ series: [series] })
    expect(first[0]).toMatchObject({ virtual: true, task: { id: 's:run:2026-11-18', seriesId: 'run', goalId: 'g1' } })

    const done = (date: string) => makeDone({ id: `s:run:${date}`, source: 'series', seriesId: 'run', date })
    expect(list({ series: [series], tasks: [done('2026-11-16'), done('2026-11-17')] })).toHaveLength(0)
  })

  it('цели с фиксированным расписанием виртуальных задач не дают', () => {
    expect(list({ goals: [makeGoal()] })).toEqual([])
  })
})
