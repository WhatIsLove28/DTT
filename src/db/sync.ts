import { addDaysISO, toISODate, weekStartOf } from '../domain/dates'
import { generateForWeek } from '../domain/generate'
import { applyOverdueRules } from '../domain/overdue'
import type { ISODate } from '../domain/types'
import { db } from './db'
import { goalsRepo, metaRepo, seriesRepo, tasksRepo } from './repositories'

export const LAST_GENERATED_WEEK = 'lastGeneratedWeek'

/** Сколько недель максимум догенерируем после долгого перерыва */
const MAX_CATCH_UP_WEEKS = 52

/**
 * Приводит базу в актуальное состояние на день `today`:
 * 1) создаёт недостающие экземпляры задач — за текущую неделю и за все недели,
 *    пропущенные с прошлого запуска;
 * 2) применяет правила просрочки (перевод в skipped).
 * Безопасно вызывать сколько угодно раз.
 */
export async function runSync(today: ISODate = toISODate(new Date())): Promise<void> {
  await db.transaction('rw', db.goals, db.series, db.tasks, db.meta, async () => {
    const currentWeek = weekStartOf(today)
    const oldestAllowed = addDaysISO(currentWeek, -7 * MAX_CATCH_UP_WEEKS)
    const last = await metaRepo.get<ISODate>(LAST_GENERATED_WEEK)
    let week = !last || last > currentWeek ? currentWeek : last < oldestAllowed ? oldestAllowed : last

    const [goals, series, ids] = await Promise.all([goalsRepo.list(), seriesRepo.list(), tasksRepo.allIds()])
    const existingTaskIds = new Set(ids)
    for (; week <= currentWeek; week = addDaysISO(week, 7)) {
      const created = generateForWeek(week, { goals, series, existingTaskIds })
      await tasksRepo.addMany(created)
      for (const t of created) existingTaskIds.add(t.id)
    }
    await metaRepo.set(LAST_GENERATED_WEEK, currentWeek)

    // Для правил просрочки достаточно задач начиная с самой старой незавершённой.
    const open = await tasksRepo.listOpen()
    if (open.length === 0) return
    const oldestOpen = open.reduce((min, t) => (t.date < min ? t.date : min), open[0].date)
    const recent = await tasksRepo.listByDateRange(oldestOpen, today)
    await tasksRepo.setStatus(applyOverdueRules(today, recent), 'skipped')
  })
}
