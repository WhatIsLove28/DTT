import type { ISODate } from '../../domain/types'

export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'

/** Что записывается в подходе: вес и повторы, только повторы, время, дистанция со временем */
export type ExerciseKind = 'weight_reps' | 'reps' | 'time' | 'distance'

/** Упражнение, показанное пользователю: из встроенного справочника или своё */
export interface Exercise {
  id: string
  name: string
  muscle: MuscleGroup
  kind: ExerciseKind
  custom?: boolean
}

/** Своё упражнение — запись в базе */
export interface CustomExercise {
  id: string
  name: string
  muscle: MuscleGroup
  kind: ExerciseKind
}

export interface WorkoutSet {
  /** В выбранных единицах (кг или фунты) */
  weight?: number
  reps?: number
  seconds?: number
  /** В выбранных единицах (км или мили) */
  distance?: number
  done: boolean
}

export interface WorkoutEntry {
  id: string
  exerciseId: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  name: string
  date: ISODate
  /** ISO-дата со временем начала */
  startedAt: string
  /** Заполняется при завершении; без него тренировка считается идущей */
  finishedAt?: string
  /** Недельная цель, в которую засчитывается завершённая тренировка */
  goalId?: string
  entries: WorkoutEntry[]
}
