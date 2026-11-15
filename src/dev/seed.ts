// Тестовые данные для разработки. Включаются адресом:
//   ?seed=1      — заполнить пустую базу
//   ?seed=reset  — очистить базу и заполнить заново
// Подключается только в dev-сборке (см. main.tsx).
import { db } from '../db/db'
import { metaRepo } from '../db/repositories'
import { LAST_GENERATED_WEEK, runSync } from '../db/sync'
import { addDaysISO, toISODate, weekStartOf } from '../domain/dates'
import { newId } from '../domain/ids'
import type { Category, Task, TaskSeries, WeeklyGoal } from '../domain/types'

export async function seedIfRequested(): Promise<void> {
  const param = new URLSearchParams(window.location.search).get('seed')
  if (!param) return
  if (param === 'reset') {
    await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((t) => t.clear())))
  }
  if ((await db.categories.count()) > 0) return

  const today = toISODate(new Date())
  const thisWeek = weekStartOf(today)
  // Цели и серии «созданы» две недели назад, чтобы была история.
  const start = addDaysISO(thisWeek, -14)

  const categories: Category[] = [
    { id: 'sport', name: 'Спорт', color: '#ff9500' },
    { id: 'study', name: 'Учёба', color: '#5856d6' },
    { id: 'work', name: 'Работа', color: '#007aff' },
    { id: 'home', name: 'Дом', color: '#34c759' },
  ]

  const goalBase = { repeatWeekly: true, weekStart: start, startDate: start }
  const goals: WeeklyGoal[] = [
    {
      ...goalBase,
      id: 'goal-training',
      title: 'Тренировка',
      categoryId: 'sport',
      schedule: { type: 'weekdays', weekdays: [1, 3, 5] },
      targetType: 'count',
      targetValue: 3,
      defaultDurationMin: 60,
      defaultStartTime: '19:00',
    },
    {
      ...goalBase,
      id: 'goal-english',
      title: 'Английский',
      categoryId: 'study',
      schedule: { type: 'times_per_week', timesPerWeek: 3 },
      targetType: 'count',
      targetValue: 3,
      defaultDurationMin: 30,
    },
    {
      ...goalBase,
      id: 'goal-reading',
      title: 'Чтение перед сном',
      categoryId: 'home',
      schedule: { type: 'daily' },
      targetType: 'percent',
      targetValue: 80,
      defaultDurationMin: 20,
      defaultStartTime: '22:30',
    },
    {
      ...goalBase,
      id: 'goal-stretching',
      title: 'Растяжка',
      categoryId: 'sport',
      schedule: { type: 'every_n_days', interval: 2 },
      targetType: 'count',
      targetValue: 3,
      defaultDurationMin: 15,
    },
  ]

  const series: TaskSeries[] = [
    {
      id: 'series-mail',
      title: 'Разобрать почту',
      categoryId: 'work',
      recurrence: { type: 'weekdays', weekdays: [1, 2, 3, 4, 5] },
      plannedDurationMin: 15,
      startTime: '09:00',
      startDate: start,
    },
  ]

  const manual = (title: string, date: string, categoryId: string, minutes: number, startTime?: string): Task => ({
    id: newId(),
    title,
    date,
    categoryId,
    source: 'manual',
    plannedDurationMin: minutes,
    startTime,
    status: 'todo',
  })
  const tasks: Task[] = [
    manual('Оплатить интернет', addDaysISO(today, -1), 'home', 10),
    manual('Отчёт по проекту', today, 'work', 90, '10:00'),
    manual('Купить продукты', today, 'home', 40),
  ]

  await db.transaction('rw', db.tables, async () => {
    await db.categories.bulkAdd(categories)
    await db.goals.bulkAdd(goals)
    await db.series.bulkAdd(series)
    await db.tasks.bulkAdd(tasks)
    await metaRepo.set(LAST_GENERATED_WEEK, start)
  })

  // Синхронизация догенерирует две прошлые недели и пропустит просроченное;
  // затем две трети прошлых задач помечаем выполненными, чтобы история была живой.
  await runSync(today)
  const past = (await db.tasks.where('date').below(today).toArray()).filter((t) => t.source !== 'manual')
  await db.tasks.bulkPut(
    past
      .filter((_, i) => i % 3 !== 0)
      .map((t) => ({
        ...t,
        status: 'done' as const,
        completedAt: `${t.date}T12:00:00`,
        actualDurationMin: t.plannedDurationMin,
      })),
  )
  console.info('[seed] тестовые данные загружены')
}
