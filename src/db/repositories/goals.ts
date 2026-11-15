import type { WeeklyGoal } from '../../domain/types'
import { db } from '../db'

export const goalsRepo = {
  list: (): Promise<WeeklyGoal[]> => db.goals.toArray(),
  get: (id: string): Promise<WeeklyGoal | undefined> => db.goals.get(id),
  put: (goal: WeeklyGoal): Promise<string> => db.goals.put(goal),
  remove: (id: string): Promise<void> => db.goals.delete(id),
}
