import { t } from '../i18n'
import type { GoalTargetType, Recurrence } from './types'

export { pluralRu } from '../i18n/plural'

/** Короткое описание правила повторения: «пн, ср, пт», «через день», «3 раза в неделю» */
export function formatRecurrence(r: Recurrence): string {
  const text = t.recurrence
  switch (r.type) {
    case 'none':
      return text.textNone
    case 'daily':
      return text.textDaily
    case 'every_n_days': {
      const n = Math.max(1, r.interval ?? 1)
      if (n === 1) return text.textDaily
      if (n === 2) return text.textEveryOther
      return text.textEveryN(n)
    }
    case 'weekdays': {
      const days = [...(r.weekdays ?? [])].sort((a, b) => a - b)
      if (days.length === 7) return text.textDaily
      return days.map((d) => text.textWeekdays[d - 1]).join(', ')
    }
    case 'times_per_week':
      return text.textTimesPerWeek(r.timesPerWeek ?? 0)
  }
}

/** Сколько выполнений в неделю естественно даёт расписание — подсказка для нормы цели */
export function naturalWeeklyCount(r: Recurrence): number {
  switch (r.type) {
    case 'none':
      return 1
    case 'daily':
      return 7
    case 'every_n_days':
      return Math.max(1, Math.floor(7 / Math.max(1, r.interval ?? 1)))
    case 'weekdays':
      return Math.max(1, (r.weekdays ?? []).length)
    case 'times_per_week':
      return Math.max(1, r.timesPerWeek ?? 1)
  }
}

/** Проверка правила перед сохранением; возвращает текст ошибки или undefined */
export function recurrenceError(r: Recurrence): string | undefined {
  if (r.type === 'weekdays' && (r.weekdays ?? []).length === 0) return t.recurrence.errWeekdays
  if (r.type === 'every_n_days' && !((r.interval ?? 0) >= 1)) return t.recurrence.errInterval
  if (r.type === 'times_per_week' && !((r.timesPerWeek ?? 0) >= 1 && (r.timesPerWeek ?? 0) <= 7)) {
    return t.recurrence.errTimes
  }
  return undefined
}

/** 45 → «45 мин», 60 → «1 ч», 90 → «1 ч 30 мин» */
export function formatDuration(minutes: number): string {
  return t.duration(Math.floor(minutes / 60), minutes % 60)
}

/** «4 раза в неделю» или «80 %» */
export function formatGoalTarget(type: GoalTargetType, target: number): string {
  return type === 'count' ? t.recurrence.textTimesPerWeek(target) : `${target} %`
}

/** «2 / 4» или «50 %» */
export function formatGoalFact(type: GoalTargetType, fact: number, target: number): string {
  return type === 'count' ? `${fact} / ${target}` : `${fact} %`
}
