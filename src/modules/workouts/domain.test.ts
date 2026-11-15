import { describe, expect, it } from 'vitest'
import { allExercises, builtinExercises, MUSCLE_GROUPS } from './catalog'
import {
  activeWorkout,
  exerciseHistory,
  exerciseRecords,
  formatSeconds,
  formatSet,
  initialSets,
  isSetFilled,
  lastPerformance,
  nextSet,
  recentExerciseIds,
  repeatWorkout,
  searchExercises,
  workoutStats,
  workoutsInWeek,
} from './domain'
import type { Workout, WorkoutSet } from './types'

const BENCH = 'b:bench-press'
const PLANK = 'b:plank'
const units = { weight: 'кг', distance: 'км' }

const set = (weight: number, reps: number, done = true): WorkoutSet => ({ weight, reps, done })

const workout = (id: string, date: string, entries: Workout['entries'], over: Partial<Workout> = {}): Workout => ({
  id,
  name: 'Тренировка',
  date,
  startedAt: `${date}T18:00:00`,
  finishedAt: `${date}T19:05:00`,
  entries,
  ...over,
})

const history = [
  workout('w1', '2026-11-09', [{ id: 'e1', exerciseId: BENCH, sets: [set(60, 8), set(60, 8), set(65, 5, false)] }]),
  workout('w2', '2026-11-11', [
    { id: 'e2', exerciseId: BENCH, sets: [set(62.5, 8), set(70, 3)] },
    { id: 'e3', exerciseId: PLANK, sets: [{ seconds: 90, done: true }] },
  ]),
  workout('w3', '2026-11-13', [{ id: 'e4', exerciseId: BENCH, sets: [set(100, 1, false)] }], { finishedAt: undefined }),
]

describe('справочник', () => {
  it('id уникальны, во всех группах есть упражнения, названия на обоих языках', () => {
    const ru = builtinExercises('ru')
    const en = builtinExercises('en')
    expect(new Set(ru.map((e) => e.id)).size).toBe(ru.length)
    expect(ru.length).toBeGreaterThanOrEqual(90)
    for (const muscle of MUSCLE_GROUPS) expect(ru.some((e) => e.muscle === muscle)).toBe(true)
    expect(ru.find((e) => e.id === BENCH)?.name).toBe('Жим штанги лёжа')
    expect(en.find((e) => e.id === BENCH)?.name).toBe('Bench press')
    expect(new Set(ru.map((e) => e.name)).size).toBe(ru.length)
    expect(new Set(en.map((e) => e.name)).size).toBe(en.length)
  })

  it('свои упражнения добавляются к встроенным', () => {
    const all = allExercises([{ id: 'c1', name: 'Жим Свенда', muscle: 'chest', kind: 'weight_reps' }], 'ru')
    expect(all[all.length - 1]).toMatchObject({ id: 'c1', custom: true })
  })
})

describe('поиск упражнений', () => {
  const all = builtinExercises('ru')
  const names = (query: string, muscle?: Parameters<typeof searchExercises>[2], recent: string[] = []) =>
    searchExercises(all, query, muscle, recent).map((e) => e.name)

  it('фильтр по группе мышц', () => {
    const chest = searchExercises(all, '', 'chest')
    expect(chest.length).toBeGreaterThan(5)
    expect(chest.every((e) => e.muscle === 'chest')).toBe(true)
  })

  it('совпадение с начала названия выше, чем с начала слова и из середины', () => {
    const found = names('жим')
    expect(found[0].startsWith('Жим')).toBe(true)
    expect(found).toContain('Французский жим')
    expect(found.indexOf('Жим ногами')).toBeLessThan(found.indexOf('Французский жим'))
  })

  it('регистр и ё не важны, поиск сочетается с группой', () => {
    expect(names('ПОДЪЕМ НОГ')).toEqual(['Подъём ног в висе', 'Подъём ног лёжа'])
    expect(names('тяга', 'legs')).toEqual(['Румынская тяга', 'Становая тяга сумо'])
    expect(names('такого нет')).toEqual([])
  })

  it('без запроса недавние идут первыми', () => {
    expect(names('', undefined, [PLANK, BENCH]).slice(0, 2)).toEqual(['Планка', 'Жим штанги лёжа'])
  })

  it('недавние — по последним тренировкам, включая идущую', () => {
    expect(recentExerciseIds(history)).toEqual([BENCH, PLANK])
  })
})

describe('подходы', () => {
  it('прошлый раз — выполненные подходы последней завершённой тренировки', () => {
    expect(lastPerformance(history, BENCH)).toEqual([set(62.5, 8), set(70, 3)])
    expect(lastPerformance(history, BENCH, 'w2')).toEqual([set(60, 8), set(60, 8)])
    expect(lastPerformance(history, 'b:squat')).toEqual([])
  })

  it('новое упражнение повторяет прошлые подходы неотмеченными, без истории — один пустой', () => {
    expect(initialSets([set(60, 8), set(60, 6)])).toEqual([set(60, 8, false), set(60, 6, false)])
    expect(initialSets([])).toEqual([{ done: false }])
  })

  it('следующий подход копирует предыдущий', () => {
    expect(nextSet([set(60, 8)])).toEqual(set(60, 8, false))
    expect(nextSet([])).toEqual({ done: false })
  })

  it('заполненность подхода зависит от типа упражнения', () => {
    expect(isSetFilled({ weight: 0, reps: 10, done: false }, 'weight_reps')).toBe(true)
    expect(isSetFilled({ reps: 10, done: false }, 'weight_reps')).toBe(false)
    expect(isSetFilled({ weight: 60, done: false }, 'weight_reps')).toBe(false)
    expect(isSetFilled({ reps: 12, done: false }, 'reps')).toBe(true)
    expect(isSetFilled({ done: false }, 'time')).toBe(false)
    expect(isSetFilled({ seconds: 1800, done: false }, 'distance')).toBe(true)
  })

  it('запись подхода', () => {
    expect(formatSeconds(95)).toBe('1:35')
    expect(formatSet(set(62.5, 8), 'weight_reps', units)).toBe('62.5 кг × 8')
    expect(formatSet({ reps: 12, done: true }, 'reps', units)).toBe('12')
    expect(formatSet({ seconds: 90, done: true }, 'time', units)).toBe('1:30')
    expect(formatSet({ distance: 5, seconds: 1800, done: true }, 'distance', units)).toBe('5 км · 30:00')
  })
})

describe('итоги', () => {
  it('статистика считает только выполненные подходы', () => {
    expect(workoutStats(history[0])).toEqual({ exercises: 1, sets: 2, volume: 960, minutes: 65 })
    expect(workoutStats(history[2])).toEqual({ exercises: 1, sets: 0, volume: 0, minutes: undefined })
  })

  it('тренировки недели — только завершённые, включая границы недели', () => {
    const more = [...history, workout('w4', '2026-11-15', []), workout('w5', '2026-11-16', [])]
    expect(workoutsInWeek(more, '2026-11-09')).toBe(3)
    expect(workoutsInWeek(more, '2026-11-16')).toBe(1)
  })

  it('идущая тренировка', () => {
    expect(activeWorkout(history)?.id).toBe('w3')
    expect(activeWorkout(history.slice(0, 2))).toBeUndefined()
  })

  it('повтор тренировки сохраняет упражнения и значения, сбрасывает отметки', () => {
    let n = 0
    const copy = repeatWorkout({ ...history[1], goalId: 'g1' }, '2026-11-15', '2026-11-15T10:00:00', {
      workout: 'new',
      entry: () => `n${++n}`,
    })
    expect(copy).toMatchObject({ id: 'new', date: '2026-11-15', goalId: 'g1', name: 'Тренировка' })
    expect(copy).not.toHaveProperty('finishedAt')
    expect(copy.entries.map((e) => e.id)).toEqual(['n1', 'n2'])
    expect(copy.entries[0].sets).toEqual([set(62.5, 8, false), set(70, 3, false)])
  })

  it('рекорды — по выполненным подходам завершённых тренировок', () => {
    expect(exerciseRecords(history, BENCH, 'weight_reps')).toEqual({
      maxWeight: { weight: 70, reps: 3 },
      best1RM: 79.2,
    })
    expect(exerciseRecords(history, PLANK, 'time')).toEqual({ maxSeconds: 90 })
    expect(exerciseRecords(history, 'b:squat', 'weight_reps')).toEqual({})
  })

  it('история упражнения — последние первыми, без идущей тренировки', () => {
    expect(exerciseHistory(history, BENCH).map((s) => [s.date, s.sets.length])).toEqual([
      ['2026-11-11', 2],
      ['2026-11-09', 2],
    ])
  })
})
