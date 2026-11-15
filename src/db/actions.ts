// Действия пользователя над данными. Каждое — одна транзакция; экраны вызывают только их.
import { format } from 'date-fns'
import { addDaysISO, toISODate, weekStartOf } from '../domain/dates'
import { newId } from '../domain/ids'
import { isOpen } from '../domain/overdue'
import { t } from '../i18n'
import type { Category, ISODate, Recurrence, Task, TaskSeries, TimeOfDay, WeeklyGoal } from '../domain/types'
import { db } from './db'
import { categoriesRepo, goalsRepo, metaRepo, seriesRepo, tasksRepo } from './repositories'
import { runSync } from './sync'

const todayISO = (): ISODate => toISODate(new Date())
const nowStamp = (): string => format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")

/** Транзакция по всем таблицам с данными */
function tx<T>(body: () => Promise<T>): Promise<T> {
  return db.transaction('rw', [db.categories, db.goals, db.series, db.tasks, db.meta], body)
}

/** Пометка удаления: запись остаётся, чтобы генерация не создала экземпляр заново */
function tombstone(task: Task): Task {
  const { completedAt: _c, actualDurationMin: _a, ...rest } = task
  return { ...rest, status: 'skipped', deleted: true }
}

/**
 * Догенерирует экземпляры после изменения цели или серии.
 * Правка действует с сегодняшнего дня, поэтому экземпляры, которые новое расписание
 * добавило бы на уже прошедшие дни этой недели, сразу помечаются удалёнными.
 */
async function resync(today: ISODate, isAffected: (t: Task) => boolean): Promise<void> {
  const before = new Set(await tasksRepo.allIds())
  await runSync(today)
  if (weekStartOf(today) === today) return
  const past = await tasksRepo.listByDateRange(weekStartOf(today), addDaysISO(today, -1))
  await tasksRepo.putMany(past.filter((t) => !before.has(t.id) && isAffected(t)).map(tombstone))
}

// ───────────── Категории ─────────────

const DEFAULT_CATEGORY_COLORS = ['#007aff', '#ff9500', '#5856d6', '#34c759']

/** Стартовые категории; названия — на языке интерфейса в момент первого запуска */
export function defaultCategories(): Omit<Category, 'id'>[] {
  return DEFAULT_CATEGORY_COLORS.map((color, i) => ({ name: t.settings.defaultCategories[i], color }))
}

const INITIALIZED = 'initialized'

/** При самом первом запуске создаёт стартовый набор категорий */
export async function ensureDefaults(): Promise<void> {
  await tx(async () => {
    if (await metaRepo.get<boolean>(INITIALIZED)) return
    if ((await categoriesRepo.list()).length === 0) {
      for (const c of defaultCategories()) await categoriesRepo.put({ id: newId(), ...c })
    }
    await metaRepo.set(INITIALIZED, true)
  })
}

export async function saveCategory(input: { id?: string; name: string; color: string }): Promise<void> {
  await categoriesRepo.put({ id: input.id ?? newId(), name: input.name.trim(), color: input.color })
}

/** Удаляет категорию, перенося её цели, серии и задачи в категорию moveToId */
export async function deleteCategory(id: string, moveToId: string): Promise<void> {
  if (id === moveToId) throw new Error(t.settings.errMoveToSame)
  await tx(async () => {
    if (!(await categoriesRepo.get(moveToId))) throw new Error(t.settings.errMoveToMissing)
    await db.goals.where('categoryId').equals(id).modify({ categoryId: moveToId })
    await db.series.where('categoryId').equals(id).modify({ categoryId: moveToId })
    await db.tasks.filter((t) => t.categoryId === id).modify({ categoryId: moveToId })
    await categoriesRepo.remove(id)
  })
}

// ───────────── Цели ─────────────

export interface GoalInput {
  title: string
  categoryId: string
  schedule: Recurrence
  targetType: WeeklyGoal['targetType']
  targetValue: number
  defaultDurationMin: number
  defaultStartTime?: TimeOfDay
  repeatWeekly: boolean
}

/**
 * Создаёт цель. startWeek — понедельник недели, с которой она начинается (не раньше текущей):
 * на текущей неделе цель стартует сегодня, на будущей — с понедельника.
 */
export async function createGoal(
  input: GoalInput,
  today: ISODate = todayISO(),
  startWeek: ISODate = weekStartOf(today),
): Promise<string> {
  const week = startWeek > weekStartOf(today) ? weekStartOf(startWeek) : weekStartOf(today)
  const goal: WeeklyGoal = { id: newId(), ...input, weekStart: week, startDate: week > today ? week : today }
  await tx(async () => {
    await goalsRepo.put(goal)
    await runSync(today)
  })
  return goal.id
}

/** Убирает ещё не начатые экземпляры цели с сегодняшнего дня; начатым обновляет поля */
async function refreshGoalInstances(goal: WeeklyGoal, today: ISODate): Promise<void> {
  const instances = (await tasksRepo.listByGoal(goal.id)).filter(
    (t) => t.source === 'goal' && !t.deleted && t.date >= today,
  )
  await tasksRepo.removeMany(instances.filter((t) => t.status === 'todo').map((t) => t.id))
  await tasksRepo.putMany(
    instances
      .filter((t) => t.status === 'in_progress')
      .map((t) => ({
        ...t,
        title: goal.title,
        categoryId: goal.categoryId,
        plannedDurationMin: goal.defaultDurationMin,
        startTime: goal.defaultStartTime,
      })),
  )
}

/**
 * Изменение цели применяется к сегодняшнему и будущим экземплярам.
 * Выключение «Повторять каждую неделю» ставит endDate = сегодня,
 * включение обратно — снимает его.
 */
export async function updateGoal(goal: WeeklyGoal, input: GoalInput, today: ISODate = todayISO()): Promise<void> {
  const next: WeeklyGoal = { ...goal, ...input }
  if (goal.repeatWeekly && !input.repeatWeekly) next.endDate = today
  if (!goal.repeatWeekly && input.repeatWeekly) delete next.endDate
  if (!input.defaultStartTime) delete next.defaultStartTime
  await tx(async () => {
    await goalsRepo.put(next)
    await refreshGoalInstances(next, today)
    await resync(today, (t) => t.source === 'goal' && t.goalId === goal.id)
  })
}

/** Архив: цель исчезает с главного экрана, её будущие экземпляры удаляются, история остаётся */
export async function archiveGoal(goal: WeeklyGoal, today: ISODate = todayISO()): Promise<void> {
  const yesterday = addDaysISO(today, -1)
  const next: WeeklyGoal = {
    ...goal,
    archived: true,
    repeatWeekly: false,
    endDate: goal.endDate && goal.endDate < yesterday ? goal.endDate : yesterday,
  }
  await tx(async () => {
    await goalsRepo.put(next)
    const open = (await tasksRepo.listByGoal(goal.id)).filter(
      (t) => t.source === 'goal' && !t.deleted && isOpen(t) && t.date >= today,
    )
    await tasksRepo.removeMany(open.map((t) => t.id))
  })
}

/** Полное удаление цели вместе с её экземплярами; привязанные ручные задачи и серии отвязываются */
export async function deleteGoal(goalId: string): Promise<void> {
  await tx(async () => {
    const linked = await tasksRepo.listByGoal(goalId)
    await tasksRepo.removeMany(linked.filter((t) => t.source === 'goal').map((t) => t.id))
    await tasksRepo.putMany(
      linked
        .filter((t) => t.source !== 'goal')
        .map((t) => {
          const { goalId: _g, ...rest } = t
          return rest
        }),
    )
    for (const s of await seriesRepo.list()) {
      if (s.goalId !== goalId) continue
      const { goalId: _g, ...rest } = s
      await seriesRepo.put(rest)
    }
    await goalsRepo.remove(goalId)
  })
}

// ───────────── Задачи ─────────────

export interface TaskInput {
  title: string
  categoryId: string
  date: ISODate
  plannedDurationMin: number
  startTime?: TimeOfDay
  goalId?: string
  /** type: 'none' — разовая задача, иначе — серия с автоповтором */
  recurrence: Recurrence
}

function seriesFromInput(id: string, input: TaskInput, startDate: ISODate): TaskSeries {
  return {
    id,
    title: input.title,
    categoryId: input.categoryId,
    ...(input.goalId ? { goalId: input.goalId } : {}),
    recurrence: input.recurrence,
    plannedDurationMin: input.plannedDurationMin,
    ...(input.startTime ? { startTime: input.startTime } : {}),
    startDate,
  }
}

/** Поля экземпляра, которые задаёт форма */
function applyInput(task: Task, input: TaskInput): Task {
  const { goalId: _g, startTime: _s, ...rest } = task
  return {
    ...rest,
    title: input.title,
    categoryId: input.categoryId,
    plannedDurationMin: input.plannedDurationMin,
    ...(input.goalId ? { goalId: input.goalId } : {}),
    ...(input.startTime ? { startTime: input.startTime } : {}),
  }
}

export async function createTask(input: TaskInput, today: ISODate = todayISO()): Promise<void> {
  await tx(async () => {
    if (input.recurrence.type === 'none') {
      const task: Task = {
        id: newId(),
        title: input.title,
        date: input.date,
        categoryId: input.categoryId,
        source: 'manual',
        plannedDurationMin: input.plannedDurationMin,
        status: 'todo',
      }
      await tasksRepo.put(applyInput(task, input))
      return
    }
    const series = seriesFromInput(newId(), input, input.date)
    await seriesRepo.put(series)
    await resync(today, (t) => t.seriesId === series.id)
  })
}

/**
 * Сохраняет правку задачи.
 * - разовая: меняется сама; если включён автоповтор — превращается в серию;
 * - экземпляр цели: меняется только он;
 * - экземпляр серии: правка уходит в серию и действует на сегодняшний и будущие экземпляры;
 *   выключение автоповтора ставит серии endDate = сегодня.
 */
export async function updateTask(task: Task, input: TaskInput, today: ISODate = todayISO()): Promise<void> {
  await tx(async () => {
    const series = task.seriesId ? await seriesRepo.get(task.seriesId) : undefined

    if (!series) {
      if (task.source === 'manual' && input.recurrence.type !== 'none') {
        const created = seriesFromInput(newId(), input, input.date)
        await tasksRepo.remove(task.id)
        await seriesRepo.put(created)
        await resync(today, (t) => t.seriesId === created.id)
        return
      }
      const next = applyInput(task, input)
      await tasksRepo.put(task.source === 'manual' ? { ...next, date: input.date } : next)
      return
    }

    const instances = (await tasksRepo.listBySeries(series.id)).filter((t) => !t.deleted)

    if (input.recurrence.type === 'none') {
      await seriesRepo.put({ ...series, endDate: series.endDate && series.endDate < today ? series.endDate : today })
      await tasksRepo.removeMany(instances.filter((t) => isOpen(t) && t.date > today).map((t) => t.id))
      await tasksRepo.put(applyInput(task, input))
      return
    }

    // Серия без endDate: если автоповтор был выключен, правка с правилом повтора включает его снова.
    await seriesRepo.put(seriesFromInput(series.id, input, series.startDate))
    await tasksRepo.removeMany(
      instances.filter((t) => t.status === 'todo' && t.date >= today && t.id !== task.id).map((t) => t.id),
    )
    await tasksRepo.putMany(
      instances
        .filter((t) => t.status === 'in_progress' && t.date >= today && t.id !== task.id)
        .map((t) => applyInput(t, input)),
    )
    // Сам открытый экземпляр: сегодняшний «не начат» пересоздаётся генерацией, остальные правим на месте.
    if (task.status === 'todo' && task.date >= today) await tasksRepo.remove(task.id)
    else await tasksRepo.put(applyInput(task, input))
    await resync(today, (t) => t.seriesId === series.id)
  })
}

/** todo ↔ in_progress, пропуск и возврат в работу. Виртуальная гибкая задача при этом записывается в базу. */
export async function setTaskStatus(task: Task, status: Exclude<Task['status'], 'done'>): Promise<void> {
  const { completedAt: _c, actualDurationMin: _a, ...rest } = task
  await tasksRepo.put({ ...rest, status })
}

/** Выполнение засчитывается по фактическому моменту отметки */
export async function completeTask(task: Task, actualDurationMin: number): Promise<void> {
  await tasksRepo.put({ ...task, status: 'done', completedAt: nowStamp(), actualDurationMin })
}

export type DeleteScope = 'one' | 'following'

/**
 * Удаление задачи.
 * - разовая — удаляется физически;
 * - экземпляр цели или серии, «только эту» — остаётся пометка удаления;
 * - серия, «эту и последующие» — серия заканчивается накануне этой задачи.
 */
export async function deleteTask(task: Task, scope: DeleteScope = 'one'): Promise<void> {
  await tx(async () => {
    if (task.source === 'manual') {
      await tasksRepo.remove(task.id)
      return
    }
    const series = task.seriesId ? await seriesRepo.get(task.seriesId) : undefined
    if (scope === 'one' || !series) {
      await tasksRepo.put(tombstone(task))
      return
    }
    const instances = await tasksRepo.listBySeries(series.id)
    await tasksRepo.removeMany(instances.filter((t) => t.date >= task.date).map((t) => t.id))
    const endDate = addDaysISO(task.date, -1)
    const hasHistory = instances.some((t) => t.date < task.date)
    if (endDate < series.startDate && !hasHistory) await seriesRepo.remove(series.id)
    else await seriesRepo.put({ ...series, endDate: series.endDate && series.endDate < endDate ? series.endDate : endDate })
  })
}
