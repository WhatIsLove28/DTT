// Логика журнала тренировок — чистые функции без обращения к базе.
import { addDaysISO } from '../../domain/dates'
import type { ISODate } from '../../domain/types'
import type { Exercise, ExerciseKind, MuscleGroup, Workout, WorkoutEntry, WorkoutSet } from './types'

const key = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ё/g, 'е')

/**
 * Поиск упражнений: по группе мышц и по названию (совпадение с начала любого слова выше,
 * чем в середине). Без запроса недавно использованные идут первыми.
 */
export function searchExercises(
  exercises: readonly Exercise[],
  query: string,
  muscle: MuscleGroup | undefined,
  recentIds: readonly string[] = [],
): Exercise[] {
  const q = key(query)
  const recent = new Map(recentIds.map((id, i) => [id, i]))
  const rank = (e: Exercise): number => {
    const name = key(e.name)
    if (!q) return recent.get(e.id) ?? Infinity
    if (name.startsWith(q)) return 0
    return name.split(/[\s(«-]+/).some((word) => word.startsWith(q)) ? 1 : 2
  }
  return exercises
    .filter((e) => (!muscle || e.muscle === muscle) && (!q || key(e.name).includes(q)))
    .map((e, index) => ({ e, r: rank(e), index }))
    .sort((a, b) => a.r - b.r || (q ? a.e.name.localeCompare(b.e.name) : a.index - b.index))
    .map(({ e }) => e)
}

/** Завершённые тренировки, последние первыми */
const finished = (workouts: readonly Workout[]): Workout[] =>
  workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))

/** Упражнения в порядке последнего использования (для «недавних» в поиске) */
export function recentExerciseIds(workouts: readonly Workout[]): string[] {
  const ids: string[] = []
  for (const w of [...workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
    for (const entry of w.entries) if (!ids.includes(entry.exerciseId)) ids.push(entry.exerciseId)
  }
  return ids
}

const doneSets = (entry: WorkoutEntry): WorkoutSet[] => entry.sets.filter((s) => s.done)

/** Выполненные подходы упражнения в последней завершённой тренировке (кроме exceptId) */
export function lastPerformance(workouts: readonly Workout[], exerciseId: string, exceptId?: string): WorkoutSet[] {
  for (const w of finished(workouts)) {
    if (w.id === exceptId) continue
    const sets = w.entries.filter((e) => e.exerciseId === exerciseId).flatMap(doneSets)
    if (sets.length > 0) return sets
  }
  return []
}

const blank = ({ done: _done, ...values }: WorkoutSet): WorkoutSet => ({ ...values, done: false })

/** Подходы нового упражнения: как в прошлый раз, но не отмеченные; без истории — один пустой */
export function initialSets(last: readonly WorkoutSet[]): WorkoutSet[] {
  return last.length > 0 ? last.map(blank) : [{ done: false }]
}

/** Новый подход повторяет значения предыдущего */
export function nextSet(sets: readonly WorkoutSet[]): WorkoutSet {
  const prev = sets[sets.length - 1]
  return prev ? blank(prev) : { done: false }
}

/** Заполнен ли подход настолько, чтобы его можно было отметить выполненным */
export function isSetFilled(set: WorkoutSet, kind: ExerciseKind): boolean {
  switch (kind) {
    case 'weight_reps':
      return (set.reps ?? 0) > 0 && set.weight !== undefined && set.weight >= 0
    case 'reps':
      return (set.reps ?? 0) > 0
    case 'time':
      return (set.seconds ?? 0) > 0
    case 'distance':
      return (set.distance ?? 0) > 0 || (set.seconds ?? 0) > 0
  }
}

/** 95 → '1:35' */
export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const num = (n: number): string => String(Math.round(n * 100) / 100)

export interface UnitLabels {
  weight: string
  distance: string
}

/** Короткая запись подхода: «60 кг × 8», «12», «1:30», «5 км · 30:00» */
export function formatSet(set: WorkoutSet, kind: ExerciseKind, units: UnitLabels): string {
  switch (kind) {
    case 'weight_reps':
      return `${num(set.weight ?? 0)} ${units.weight} × ${set.reps ?? 0}`
    case 'reps':
      return String(set.reps ?? 0)
    case 'time':
      return formatSeconds(set.seconds ?? 0)
    case 'distance':
      return [
        set.distance ? `${num(set.distance)} ${units.distance}` : '',
        set.seconds ? formatSeconds(set.seconds) : '',
      ]
        .filter(Boolean)
        .join(' · ')
  }
}

export interface WorkoutStats {
  exercises: number
  /** Выполненные подходы */
  sets: number
  /** Сумма «вес × повторы» по выполненным подходам */
  volume: number
  /** Длительность в минутах; у идущей тренировки — undefined */
  minutes: number | undefined
}

export function minutesBetween(from: string, to: string): number {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000))
}

export function workoutStats(workout: Workout): WorkoutStats {
  const sets = workout.entries.flatMap(doneSets)
  return {
    exercises: workout.entries.length,
    sets: sets.length,
    volume: sets.reduce((total, s) => total + (s.weight ?? 0) * (s.reps ?? 0), 0),
    minutes: workout.finishedAt ? minutesBetween(workout.startedAt, workout.finishedAt) : undefined,
  }
}

/** Сколько тренировок завершено за неделю, начинающуюся в weekStart */
export function workoutsInWeek(workouts: readonly Workout[], weekStart: ISODate): number {
  const end = addDaysISO(weekStart, 6)
  return workouts.filter((w) => w.finishedAt && w.date >= weekStart && w.date <= end).length
}

/** Идущая (не завершённая) тренировка — последняя из начатых */
export function activeWorkout(workouts: readonly Workout[]): Workout | undefined {
  return workouts.filter((w) => !w.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
}

export interface Ids {
  workout: string
  entry: () => string
}

/** Новая тренировка по образцу прежней: те же упражнения и значения, подходы не отмечены */
export function repeatWorkout(source: Workout, date: ISODate, startedAt: string, ids: Ids): Workout {
  return {
    id: ids.workout,
    name: source.name,
    date,
    startedAt,
    ...(source.goalId ? { goalId: source.goalId } : {}),
    entries: source.entries.map((e) => ({ id: ids.entry(), exerciseId: e.exerciseId, sets: e.sets.map(blank) })),
  }
}

export interface ExerciseRecords {
  /** Самый большой вес (и повторы в том подходе) */
  maxWeight?: { weight: number; reps: number }
  /** Лучший расчётный разовый максимум по формуле Эпли: вес × (1 + повторы / 30) */
  best1RM?: number
  maxReps?: number
  maxSeconds?: number
  maxDistance?: number
}

/** Личные рекорды по выполненным подходам завершённых тренировок */
export function exerciseRecords(workouts: readonly Workout[], exerciseId: string, kind: ExerciseKind): ExerciseRecords {
  const sets = finished(workouts).flatMap((w) => w.entries.filter((e) => e.exerciseId === exerciseId).flatMap(doneSets))
  const max = (values: number[]) => (values.some((v) => v > 0) ? Math.max(...values) : undefined)
  const records: ExerciseRecords = {}
  if (kind === 'weight_reps') {
    const best = sets
      .filter((s) => (s.reps ?? 0) > 0)
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0]
    if (best) records.maxWeight = { weight: best.weight ?? 0, reps: best.reps ?? 0 }
    const oneRm = max(sets.map((s) => (s.weight ?? 0) * (1 + (s.reps ?? 0) / 30)))
    if (oneRm) records.best1RM = Math.round(oneRm * 10) / 10
  }
  if (kind === 'reps') records.maxReps = max(sets.map((s) => s.reps ?? 0))
  if (kind === 'time' || kind === 'distance') records.maxSeconds = max(sets.map((s) => s.seconds ?? 0))
  if (kind === 'distance') records.maxDistance = max(sets.map((s) => s.distance ?? 0))
  return records
}

export interface ExerciseSession {
  workoutId: string
  date: ISODate
  sets: WorkoutSet[]
}

/** История упражнения: выполненные подходы по завершённым тренировкам, последние первыми */
export function exerciseHistory(workouts: readonly Workout[], exerciseId: string): ExerciseSession[] {
  return finished(workouts).flatMap((w) => {
    const sets = w.entries.filter((e) => e.exerciseId === exerciseId).flatMap(doneSets)
    return sets.length > 0 ? [{ workoutId: w.id, date: w.date, sets }] : []
  })
}
