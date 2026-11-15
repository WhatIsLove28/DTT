import type { ISODate } from './types'

/** Id экземпляра задачи из цели: один на (цель, дата) */
export function goalTaskId(goalId: string, date: ISODate): string {
  return `g:${goalId}:${date}`
}

/** Id экземпляра задачи из серии: один на (серия, дата) */
export function seriesTaskId(seriesId: string, date: ISODate): string {
  return `s:${seriesId}:${date}`
}

/**
 * Случайный id для ручных записей.
 * Не crypto.randomUUID: он доступен только в защищённом контексте и не работает по http://<IP>.
 */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
