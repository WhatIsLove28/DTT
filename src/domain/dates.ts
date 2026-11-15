import { addDays, differenceInCalendarDays, format, getISODay, parseISO, startOfWeek } from 'date-fns'
import type { ISODate } from './types'

// Даты без времени хранятся строками 'yyyy-MM-dd' в местном часовом поясе.
// Такие строки можно сравнивать обычными <, >, ===.

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd')
}

export function fromISODate(s: ISODate): Date {
  return parseISO(s)
}

export function addDaysISO(s: ISODate, days: number): ISODate {
  return toISODate(addDays(fromISODate(s), days))
}

/** Сколько календарных дней от `from` до `to` (отрицательно, если `to` раньше) */
export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(fromISODate(to), fromISODate(from))
}

/** 1 = пн … 7 = вс */
export function isoWeekday(s: ISODate): number {
  return getISODay(fromISODate(s))
}

/** Понедельник недели, в которую попадает дата */
export function weekStartOf(s: ISODate): ISODate {
  return toISODate(startOfWeek(fromISODate(s), { weekStartsOn: 1 }))
}

/** Воскресенье недели, которая начинается в `weekStart` */
export function weekEndOf(weekStart: ISODate): ISODate {
  return addDaysISO(weekStart, 6)
}

/** Семь дат недели, пн–вс */
export function weekDates(weekStart: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i))
}

export function isInWeek(date: ISODate, weekStart: ISODate): boolean {
  return date >= weekStart && date <= weekEndOf(weekStart)
}

/** Понедельник недели, в которую попадает момент времени (например, completedAt) */
export function weekStartOfTimestamp(timestamp: string): ISODate {
  return weekStartOf(toISODate(new Date(timestamp)))
}
