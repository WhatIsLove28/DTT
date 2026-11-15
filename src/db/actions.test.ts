// Календарь тестов: 9 ноября 2026 — понедельник, 11-е — среда.
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { goalProgress, goalStatus } from '../domain/goalProgress'
import { makeGoal, makeTask } from '../domain/testFactories'
import { getTodayList } from '../domain/today'
import type { Task } from '../domain/types'
import {
  archiveGoal,
  completeTask,
  createGoal,
  createTask,
  deleteCategory,
  deleteGoal,
  deleteTask,
  ensureDefaults,
  setTaskStatus,
  updateGoal,
  updateTask,
  type GoalInput,
  type TaskInput,
} from './actions'
import { exportBackup, importBackup } from './backup'
import { db } from './db'
import { categoriesRepo, goalsRepo, seriesRepo, tasksRepo } from './repositories'
import { runSync } from './sync'

const WED = '2026-11-11'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const goalInput = (overrides: Partial<GoalInput> = {}): GoalInput => ({
  title: 'Тренировка',
  categoryId: 'c1',
  schedule: { type: 'weekdays', weekdays: [1, 3, 5] },
  targetType: 'count',
  targetValue: 3,
  defaultDurationMin: 60,
  repeatWeekly: true,
  ...overrides,
})

const taskInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
  title: 'Почта',
  categoryId: 'c1',
  date: WED,
  plannedDurationMin: 15,
  recurrence: { type: 'none' },
  ...overrides,
})

/** Видимые (не удалённые) задачи: «дата статус» */
const visible = async () =>
  (await tasksRepo.list())
    .filter((t) => !t.deleted)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((t) => `${t.date} ${t.status}`)

describe('цели', () => {
  it('созданная в середине недели цель сразу даёт задачи только с дня создания', async () => {
    await createGoal(goalInput(), WED)
    expect(await visible()).toEqual(['2026-11-11 todo', '2026-11-13 todo'])
  })

  it('цель на будущую неделю стартует с её понедельника и не даёт задач раньше', async () => {
    const id = await createGoal(goalInput({ schedule: { type: 'daily' } }), WED, '2026-11-16')
    expect(await goalsRepo.get(id)).toMatchObject({ weekStart: '2026-11-16', startDate: '2026-11-16' })
    expect(await tasksRepo.list()).toEqual([])
    await runSync('2026-11-17')
    expect((await visible())[0]).toBe('2026-11-16 todo')
    expect(await visible()).toHaveLength(7)
  })

  it('прошедшая неделя старта заменяется текущей', async () => {
    const id = await createGoal(goalInput(), WED, '2026-11-02')
    expect(await goalsRepo.get(id)).toMatchObject({ weekStart: '2026-11-09', startDate: WED })
  })

  it('смена расписания действует с сегодняшнего дня и не создаёт просрочек задним числом', async () => {
    const id = await createGoal(goalInput({ schedule: { type: 'weekdays', weekdays: [1, 3, 5] } }), '2026-11-09')
    await completeTask((await tasksRepo.get(`g:${id}:2026-11-09`))!, 60)
    const goal = (await goalsRepo.get(id))!
    await updateGoal(goal, goalInput({ schedule: { type: 'weekdays', weekdays: [2, 4] }, title: 'Бег' }), WED)

    const tasks = (await tasksRepo.list()).filter((t) => !t.deleted)
    expect(tasks.map((t) => `${t.date} ${t.status} ${t.title}`).sort()).toEqual([
      '2026-11-09 done Тренировка',
      '2026-11-12 todo Бег',
    ])
    // Вторник не появляется и после повторной синхронизации.
    await runSync(WED)
    await runSync('2026-11-12')
    expect((await visible()).filter((s) => s.startsWith('2026-11-10'))).toEqual([])
  })

  it('отключение повтора ставит endDate = сегодня: будущие задачи удаляются, история остаётся', async () => {
    const id = await createGoal(goalInput({ schedule: { type: 'daily' } }), '2026-11-09')
    await completeTask((await tasksRepo.get(`g:${id}:2026-11-09`))!, 60)
    await updateGoal((await goalsRepo.get(id))!, goalInput({ schedule: { type: 'daily' }, repeatWeekly: false }), WED)

    expect((await goalsRepo.get(id))?.endDate).toBe(WED)
    expect(await visible()).toEqual(['2026-11-09 done', '2026-11-10 todo', '2026-11-11 todo'])
    await runSync('2026-11-16')
    expect((await tasksRepo.list()).some((t) => t.date > WED)).toBe(false)
  })

  it('архив убирает незавершённые задачи с сегодняшнего дня и не даёт им вернуться', async () => {
    const id = await createGoal(goalInput({ schedule: { type: 'daily' } }), '2026-11-09')
    await archiveGoal((await goalsRepo.get(id))!, WED)
    expect((await goalsRepo.get(id))?.archived).toBe(true)
    await runSync(WED)
    expect(await visible()).toEqual(['2026-11-09 todo', '2026-11-10 todo'])
  })

  it('удаление цели убирает её задачи и отвязывает ручные', async () => {
    const id = await createGoal(goalInput(), '2026-11-09')
    await createTask(taskInput({ goalId: id }), WED)
    await createTask(taskInput({ goalId: id, recurrence: { type: 'daily' } }), WED)
    await deleteGoal(id)
    const tasks = await tasksRepo.list()
    expect(tasks.some((t) => t.source === 'goal')).toBe(false)
    expect(tasks.some((t) => t.goalId)).toBe(false)
    expect((await seriesRepo.list()).some((s) => s.goalId)).toBe(false)
  })

  it('выполнение привязанной ручной задачи сразу меняет прогресс и статус цели', async () => {
    const id = await createGoal(goalInput({ schedule: { type: 'none' }, targetValue: 1 }), WED)
    await createTask(taskInput({ goalId: id }), WED)
    const goal = (await goalsRepo.get(id))!
    expect(goalStatus(goal, '2026-11-09', WED, await tasksRepo.list())).toBe('on_track')

    const task = (await tasksRepo.list()).find((t) => t.source === 'manual')!
    await completeTask(task, 20)
    const tasks = await tasksRepo.list()
    expect(goalProgress(goal, weekOfNow(tasks), tasks).done).toBe(1)
  })
})

/** completeTask ставит настоящее «сейчас», поэтому неделю берём из самой записи */
function weekOfNow(tasks: Task[]): string {
  const done = tasks.find((t) => t.completedAt)!
  const d = new Date(done.completedAt!)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('задачи', () => {
  it('разовая задача создаётся на выбранную дату, серия — даёт экземпляры', async () => {
    await createTask(taskInput(), WED)
    await createTask(taskInput({ title: 'Зарядка', recurrence: { type: 'daily' } }), WED)
    const tasks = await tasksRepo.list()
    expect(tasks.filter((t) => t.source === 'manual')).toHaveLength(1)
    expect(tasks.filter((t) => t.source === 'series').map((t) => t.date).sort()).toEqual([
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
  })

  it('«только эту»: удалённый экземпляр серии не возвращается после синхронизации', async () => {
    await createTask(taskInput({ recurrence: { type: 'daily' } }), WED)
    const today = (await tasksRepo.list()).find((t) => t.date === WED)!
    await deleteTask(today, 'one')
    await runSync(WED)
    const tasks = await tasksRepo.list()
    expect(getTodayList(WED, { goals: [], series: await seriesRepo.list(), tasks })).toEqual([])
    expect(tasks.filter((t) => !t.deleted && t.date === '2026-11-12')).toHaveLength(1)
  })

  it('«эту и последующие»: серия заканчивается накануне, история остаётся', async () => {
    await createTask(taskInput({ date: '2026-11-09', recurrence: { type: 'daily' } }), '2026-11-09')
    const [series] = await seriesRepo.list()
    await completeTask((await tasksRepo.get(`s:${series.id}:2026-11-09`))!, 15)
    await deleteTask((await tasksRepo.get(`s:${series.id}:2026-11-11`))!, 'following')

    expect((await seriesRepo.get(series.id))?.endDate).toBe('2026-11-10')
    await runSync('2026-11-16')
    expect((await tasksRepo.list()).map((t) => t.date).sort()).toEqual(['2026-11-09', '2026-11-10'])
  })

  it('«эту и последующие» с первого же экземпляра удаляет серию целиком', async () => {
    await createTask(taskInput({ recurrence: { type: 'daily' } }), WED)
    await deleteTask((await tasksRepo.list()).find((t) => t.date === WED)!, 'following')
    expect(await seriesRepo.list()).toEqual([])
    expect(await tasksRepo.list()).toEqual([])
  })

  it('правка экземпляра серии меняет сегодняшний и будущие, но не прошлые', async () => {
    await createTask(taskInput({ date: '2026-11-09', recurrence: { type: 'daily' } }), '2026-11-09')
    const [series] = await seriesRepo.list()
    const today = (await tasksRepo.get(`s:${series.id}:${WED}`))!
    await updateTask(today, taskInput({ title: 'Почта и чаты', plannedDurationMin: 25, recurrence: { type: 'daily' } }), WED)

    const titles = (await tasksRepo.list()).sort((a, b) => (a.date < b.date ? -1 : 1)).map((t) => `${t.date} ${t.title}`)
    expect(titles).toEqual([
      '2026-11-09 Почта',
      '2026-11-10 Почта',
      '2026-11-11 Почта и чаты',
      '2026-11-12 Почта и чаты',
      '2026-11-13 Почта и чаты',
      '2026-11-14 Почта и чаты',
      '2026-11-15 Почта и чаты',
    ])
  })

  it('выключение автоповтора ставит серии endDate = сегодня', async () => {
    await createTask(taskInput({ date: '2026-11-09', recurrence: { type: 'daily' } }), '2026-11-09')
    const [series] = await seriesRepo.list()
    await updateTask((await tasksRepo.get(`s:${series.id}:${WED}`))!, taskInput({ recurrence: { type: 'none' } }), WED)
    expect((await seriesRepo.get(series.id))?.endDate).toBe(WED)
    await runSync('2026-11-16')
    expect((await tasksRepo.list()).map((t) => t.date).sort()).toEqual(['2026-11-09', '2026-11-10', '2026-11-11'])
  })

  it('разовая задача с включённым автоповтором превращается в серию', async () => {
    await createTask(taskInput(), WED)
    const [manual] = await tasksRepo.list()
    await updateTask(manual, taskInput({ recurrence: { type: 'weekdays', weekdays: [3, 5] } }), WED)
    const tasks = await tasksRepo.list()
    expect(tasks.every((t) => t.source === 'series')).toBe(true)
    expect(tasks.map((t) => t.date).sort()).toEqual(['2026-11-11', '2026-11-13'])
  })

  it('гибкая задача: пропуск и выполнение записывают виртуальный экземпляр в базу', async () => {
    const id = await createGoal(goalInput({ schedule: { type: 'times_per_week', timesPerWeek: 3 } }), WED)
    expect(await tasksRepo.list()).toEqual([])
    const goals = await goalsRepo.list()
    const [item] = getTodayList(WED, { goals, series: [], tasks: [] })
    expect(item.virtual).toBe(true)

    await setTaskStatus(item.task, 'skipped')
    expect((await tasksRepo.get(`g:${id}:${WED}`))?.status).toBe('skipped')
    expect(getTodayList(WED, { goals, series: [], tasks: await tasksRepo.list() }).filter((i) => i.virtual)).toEqual([])
  })

  it('возврат в работу снимает отметку о выполнении', async () => {
    await createTask(taskInput(), WED)
    const [task] = await tasksRepo.list()
    await completeTask(task, 40)
    const done = (await tasksRepo.get(task.id))!
    expect(done).toMatchObject({ status: 'done', actualDurationMin: 40 })
    await setTaskStatus(done, 'todo')
    const reopened = (await tasksRepo.get(task.id))!
    expect(reopened.status).toBe('todo')
    expect(reopened.completedAt).toBeUndefined()
    expect(reopened.actualDurationMin).toBeUndefined()
  })
})

describe('категории и бэкап', () => {
  it('стартовые категории создаются один раз', async () => {
    await ensureDefaults()
    const first = await categoriesRepo.list()
    expect(first.length).toBeGreaterThan(0)
    await categoriesRepo.remove(first[0].id)
    await ensureDefaults()
    expect(await categoriesRepo.list()).toHaveLength(first.length - 1)
  })

  it('удаление категории переносит цели, серии и задачи', async () => {
    await categoriesRepo.put({ id: 'c1', name: 'Спорт', color: '#ff9500' })
    await categoriesRepo.put({ id: 'c2', name: 'Дом', color: '#34c759' })
    await goalsRepo.put(makeGoal())
    await createTask(taskInput(), WED)
    await createTask(taskInput({ recurrence: { type: 'daily' } }), WED)
    await deleteCategory('c1', 'c2')

    expect((await categoriesRepo.list()).map((c) => c.id)).toEqual(['c2'])
    expect((await goalsRepo.list()).every((g) => g.categoryId === 'c2')).toBe(true)
    expect((await seriesRepo.list()).every((s) => s.categoryId === 'c2')).toBe(true)
    expect((await tasksRepo.list()).every((t) => t.categoryId === 'c2')).toBe(true)
    await expect(deleteCategory('c2', 'c2')).rejects.toThrow()
  })

  it('импорт заменяет все данные содержимым бэкапа', async () => {
    await categoriesRepo.put({ id: 'c1', name: 'Спорт', color: '#ff9500' })
    await tasksRepo.put(makeTask({ id: 'old', status: 'done', completedAt: '2026-11-10T12:00:00' }))
    const backup = await exportBackup()

    await tasksRepo.put(makeTask({ id: 'new' }))
    await categoriesRepo.put({ id: 'c9', name: 'Лишняя', color: '#8e8e93' })
    await importBackup(backup)

    expect((await tasksRepo.list()).map((t) => t.id)).toEqual(['old'])
    expect((await categoriesRepo.list()).map((c) => c.id)).toEqual(['c1'])
  })
})
