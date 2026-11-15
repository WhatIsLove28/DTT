import type { TaskSeries } from '../../domain/types'
import { db } from '../db'

export const seriesRepo = {
  list: (): Promise<TaskSeries[]> => db.series.toArray(),
  get: (id: string): Promise<TaskSeries | undefined> => db.series.get(id),
  put: (series: TaskSeries): Promise<string> => db.series.put(series),
  remove: (id: string): Promise<void> => db.series.delete(id),
}
