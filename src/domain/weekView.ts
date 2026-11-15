import { toISODate } from './dates'
import type { ISODate, Task, TimeOfDay } from './types'

/**
 * День, в котором задача показывается на экране недели:
 * выполненная — в фактический день (completedAt), остальные — в свой плановый.
 */
export function displayDate(task: Task): ISODate {
  return task.status === 'done' && task.completedAt ? toISODate(new Date(task.completedAt)) : task.date
}

/** Длительность блока: фактическая, если есть, иначе плановая */
export function blockMinutes(task: Task): number {
  return task.actualDurationMin ?? task.plannedDurationMin
}

export function timeToMinutes(time: TimeOfDay): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Порядок внутри дня: сначала задачи со временем по возрастанию, затем без времени */
export function sortForDay<T extends Task>(tasks: readonly T[]): T[] {
  return [...tasks].sort((a, b) => {
    const at = a.startTime
    const bt = b.startTime
    if (at && bt) return at < bt ? -1 : at > bt ? 1 : 0
    if (at || bt) return at ? -1 : 1
    return 0
  })
}

/** Раскладывает задачи (без удалённых) по дням показа */
export function groupByDisplayDate<T extends Task>(tasks: readonly T[], dates: readonly ISODate[]): Map<ISODate, T[]> {
  const map = new Map<ISODate, T[]>(dates.map((d) => [d, []]))
  for (const t of tasks) {
    if (t.deleted) continue
    map.get(displayDate(t))?.push(t)
  }
  for (const [d, list] of map) map.set(d, sortForDay(list))
  return map
}

export interface DayBlock<T extends Task = Task> {
  task: T
  /** минуты от полуночи */
  start: number
  /** длительность в минутах, не выходит за конец суток */
  minutes: number
  /** номер колонки среди пересекающихся блоков и число колонок в группе */
  col: number
  cols: number
}

/** Меньше этого блок на шкале не рисуется, поэтому и пересечения считаются по этой длине */
export const MIN_BLOCK_MINUTES = 25

/** Расставляет задачи со временем на шкале дня; пересекающиеся делят ширину поровну */
export function layoutDay<T extends Task>(tasks: readonly T[]): DayBlock<T>[] {
  const timed = sortForDay(tasks.filter((t) => t.startTime))
  const blocks: DayBlock<T>[] = []
  let group: DayBlock<T>[] = []
  let columnEnds: number[] = []
  let groupEnd = -1

  const closeGroup = () => {
    for (const b of group) b.cols = columnEnds.length
    blocks.push(...group)
    group = []
    columnEnds = []
  }

  for (const task of timed) {
    const start = timeToMinutes(task.startTime!)
    const minutes = Math.max(1, Math.min(blockMinutes(task), 24 * 60 - start))
    const end = start + Math.max(minutes, MIN_BLOCK_MINUTES)
    if (group.length > 0 && start >= groupEnd) closeGroup()
    let col = columnEnds.findIndex((e) => e <= start)
    if (col === -1) col = columnEnds.length
    columnEnds[col] = end
    groupEnd = Math.max(groupEnd, end)
    group.push({ task, start, minutes, col, cols: 1 })
  }
  closeGroup()
  return blocks
}
