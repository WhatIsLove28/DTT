/** Дата без времени, 'yyyy-MM-dd' */
export type ISODate = string
/** Время суток, 'HH:mm' */
export type TimeOfDay = string

export interface Category {
  id: string
  name: string
  color: string
}

export type RecurrenceType = 'none' | 'daily' | 'every_n_days' | 'weekdays' | 'times_per_week'

export interface Recurrence {
  type: RecurrenceType
  /** every_n_days: 2 = «через день» */
  interval?: number
  /** 1 = пн … 7 = вс */
  weekdays?: number[]
  /** гибкий режим: «3 раза в неделю, в любые дни» */
  timesPerWeek?: number
}

export type GoalTargetType = 'count' | 'percent'

export interface WeeklyGoal {
  id: string
  title: string
  categoryId: string
  schedule: Recurrence
  targetType: GoalTargetType
  targetValue: number
  defaultDurationMin: number
  defaultStartTime?: TimeOfDay
  /** false → цель только на неделю weekStart */
  repeatWeekly: boolean
  /** понедельник недели создания */
  weekStart: ISODate
  /** день создания: точка отсчёта every_n_days, раньше задачи не создаются */
  startDate: ISODate
  endDate?: ISODate
  /** цель убрана в архив: на главном экране не показывается, история остаётся */
  archived?: boolean
}

export interface TaskSeries {
  id: string
  title: string
  categoryId: string
  goalId?: string
  recurrence: Recurrence
  plannedDurationMin: number
  startTime?: TimeOfDay
  startDate: ISODate
  endDate?: ISODate
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'skipped'
export type TaskSource = 'manual' | 'series' | 'goal'

export interface Task {
  id: string
  title: string
  date: ISODate
  categoryId: string
  goalId?: string
  seriesId?: string
  source: TaskSource
  plannedDurationMin: number
  actualDurationMin?: number
  startTime?: TimeOfDay
  status: TaskStatus
  /** ISO-дата со временем фактического выполнения */
  completedAt?: string
  /**
   * Пометка удаления одного экземпляра цели или серии. Запись остаётся в базе,
   * чтобы генерация не создала экземпляр заново; нигде не показывается и не считается.
   */
  deleted?: boolean
}

/** Служебная запись «ключ — значение» (последняя сгенерированная неделя, дата бэкапа …) */
export interface MetaEntry {
  key: string
  value: unknown
}
