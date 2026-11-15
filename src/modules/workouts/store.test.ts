import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { creditGoal } from '../../db/actions'
import { exportBackup, importBackup } from '../../db/backup'
import { db } from '../../db/db'
import { goalsRepo, tasksRepo } from '../../db/repositories'
import { parseBackup } from '../../domain/backup'
import { toISODate, weekStartOf } from '../../domain/dates'
import { goalProgress } from '../../domain/goalProgress'
import { goalTaskId } from '../../domain/ids'
import { makeGoal, makeTask } from '../../domain/testFactories'
import { normalizeUnitSystem } from '../../app/units'
import { createExercise, finishWorkout, saveWorkout, startRepeat, startWorkout } from './store'

const today = toISODate(new Date())
const week = weekStartOf(today)

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const withSet = async (goalId?: string) => {
  const workout = await startWorkout('Ноги', goalId)
  const filled = { ...workout, entries: [{ id: 'e1', exerciseId: 'b:squat', sets: [{ weight: 80, reps: 5, done: true }] }] }
  await saveWorkout(filled)
  return filled
}

describe('тренировки в базе', () => {
  it('завершение без цели ничего не засчитывает', async () => {
    const { workout, credited } = await finishWorkout(await withSet())
    expect(credited).toBe(false)
    expect(workout.finishedAt).toBeTruthy()
    expect(await tasksRepo.list()).toEqual([])
  })

  it('завершение отмечает сегодняшнюю задачу цели выполненной', async () => {
    const goal = makeGoal({ schedule: { type: 'daily' }, targetValue: 7, weekStart: week, startDate: week })
    await goalsRepo.put(goal)
    await tasksRepo.put(makeTask({ id: goalTaskId('g1', today), date: today, goalId: 'g1', source: 'goal' }))

    const { credited } = await finishWorkout(await withSet('g1'))
    expect(credited).toBe(true)
    const tasks = await tasksRepo.list()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ status: 'done', source: 'goal' })
    expect(goalProgress(goal, week, tasks).value).toBe(1)
  })

  it('без задачи на сегодня создаётся выполненная привязанная задача, второй зачёт за день не делается', async () => {
    const goal = makeGoal({ schedule: { type: 'none' }, weekStart: week, startDate: week })
    await goalsRepo.put(goal)

    expect((await finishWorkout(await withSet('g1'))).credited).toBe(true)
    expect((await finishWorkout(await withSet('g1'))).credited).toBe(false)
    const tasks = await tasksRepo.list()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ title: 'Ноги', source: 'manual', goalId: 'g1', status: 'done' })
    expect(goalProgress(goal, week, tasks).value).toBe(1)
  })

  it('удалённая цель зачёт не получает', async () => {
    expect(await creditGoal('missing', 'Ноги', 30)).toBe(false)
  })

  it('повтор создаёт новую идущую тренировку с теми же упражнениями', async () => {
    const { workout } = await finishWorkout(await withSet())
    const copy = await startRepeat(workout)
    expect(copy.id).not.toBe(workout.id)
    expect(copy.finishedAt).toBeUndefined()
    expect(copy.entries[0]).toMatchObject({ exerciseId: 'b:squat', sets: [{ weight: 80, reps: 5, done: false }] })
    expect(await db.workouts.count()).toBe(2)
  })

  it('тренировки, свои упражнения и система мер переживают бэкап', async () => {
    await finishWorkout(await withSet())
    await createExercise({ name: ' Жим Свенда ', muscle: 'chest', kind: 'weight_reps' })
    await db.meta.put({ key: 'unitSystem', value: 'imperial' })

    const file = parseBackup(JSON.stringify(await exportBackup()))
    await Promise.all(db.tables.map((t) => t.clear()))
    await importBackup(file)

    expect(await db.workouts.count()).toBe(1)
    expect((await db.workoutExercises.toArray()).map((e) => e.name)).toEqual(['Жим Свенда'])
    expect(normalizeUnitSystem((await db.meta.get('unitSystem'))?.value)).toBe('imperial')
    expect(normalizeUnitSystem(undefined)).toBe('metric')
  })
})
