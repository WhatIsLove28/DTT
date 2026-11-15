// Данные модуля «Тренировки»: живое чтение и действия.
// Экран и плитка обращаются к базе только через этот файл.
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { creditGoal } from '../../db/actions'
import { db } from '../../db/db'
import { toISODate } from '../../domain/dates'
import { newId } from '../../domain/ids'
import { minutesBetween, repeatWorkout } from './domain'
import type { CustomExercise, ExerciseKind, MuscleGroup, Workout } from './types'

const nowStamp = (): string => format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")

export interface WorkoutsData {
  /** Последние первыми */
  workouts: Workout[]
  exercises: CustomExercise[]
}

/** Живые данные модуля; undefined, пока база читается */
export function useWorkouts(): WorkoutsData | undefined {
  return useLiveQuery(async () => {
    const [workouts, exercises] = await Promise.all([db.workouts.toArray(), db.workoutExercises.toArray()])
    workouts.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    return { workouts, exercises }
  }, [])
}

/** Начинает тренировку; goalId по умолчанию берётся из предыдущей */
export async function startWorkout(name: string, goalId?: string): Promise<Workout> {
  const workout: Workout = {
    id: newId(),
    name,
    date: toISODate(new Date()),
    startedAt: nowStamp(),
    ...(goalId ? { goalId } : {}),
    entries: [],
  }
  await db.workouts.put(workout)
  return workout
}

/** Начинает новую тренировку по образцу прежней */
export async function startRepeat(source: Workout): Promise<Workout> {
  const workout = repeatWorkout(source, toISODate(new Date()), nowStamp(), { workout: newId(), entry: newId })
  await db.workouts.put(workout)
  return workout
}

export async function saveWorkout(workout: Workout): Promise<void> {
  await db.workouts.put(workout)
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.workouts.delete(id)
}

/**
 * Завершает тренировку и, если выбрана цель, засчитывает её в эту цель.
 * Возвращает завершённую тренировку и признак, был ли зачёт.
 */
export async function finishWorkout(workout: Workout): Promise<{ workout: Workout; credited: boolean }> {
  const finishedAt = nowStamp()
  const done: Workout = { ...workout, finishedAt }
  await db.workouts.put(done)
  const credited = workout.goalId
    ? await creditGoal(workout.goalId, workout.name, minutesBetween(workout.startedAt, finishedAt))
    : false
  return { workout: done, credited }
}

export async function createExercise(input: { name: string; muscle: MuscleGroup; kind: ExerciseKind }): Promise<CustomExercise> {
  const exercise: CustomExercise = { id: newId(), name: input.name.trim(), muscle: input.muscle, kind: input.kind }
  await db.workoutExercises.put(exercise)
  return exercise
}
