import { afterEach, describe, expect, it } from 'vitest'
import { formatDuration, formatGoalTarget, formatRecurrence } from '../domain/format'
import { taskStatusView } from '../domain/statusView'
import { en } from './en'
import { formatDate, formatDateRange, setLang, systemLang, t } from './index'
import { ru } from './ru'

/** Пути всех значений словаря с их видом: строка, функция или список заданной длины */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}: list[${value.length}]`]
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, v]) => shape(v, path ? `${path}.${key}` : key))
  }
  return [`${path}: ${typeof value}`]
}

afterEach(() => setLang('ru'))

describe('словари', () => {
  it('в русском и английском одинаковый набор ключей', () => {
    expect(shape(en).sort()).toEqual(shape(ru).sort())
  })

  it('нет пустых строк', () => {
    const empty = (value: unknown): boolean =>
      typeof value === 'string'
        ? value.trim() === ''
        : typeof value === 'object' && value !== null && Object.values(value).some(empty)
    expect(empty(ru)).toBe(false)
    expect(empty(en)).toBe(false)
  })
})

describe('язык системы', () => {
  it('берёт первый поддерживаемый язык из предпочтений', () => {
    expect(systemLang(['ru-RU', 'en-US'])).toBe('ru')
    expect(systemLang(['en-GB', 'ru'])).toBe('en')
    expect(systemLang(['de-DE', 'ru-RU'])).toBe('ru')
  })

  it('без подходящих языков — английский', () => {
    expect(systemLang(['de-DE', 'fr'])).toBe('en')
    expect(systemLang([])).toBe('en')
  })
})

describe('переключение языка', () => {
  it('по умолчанию русский', () => {
    expect(t.common.save).toBe('Сохранить')
    expect(formatRecurrence({ type: 'weekdays', weekdays: [1, 3, 5] })).toBe('пн, ср, пт')
  })

  it('доменные тексты следуют за языком', () => {
    setLang('en')
    expect(t.common.save).toBe('Save')
    expect(formatRecurrence({ type: 'weekdays', weekdays: [1, 3, 5] })).toBe('Mon, Wed, Fri')
    expect(formatRecurrence({ type: 'every_n_days', interval: 2 })).toBe('every other day')
    expect(formatGoalTarget('count', 1)).toBe('1 time a week')
    expect(formatGoalTarget('count', 4)).toBe('4 times a week')
    expect(formatDuration(90)).toBe('1 h 30 min')
    expect(taskStatusView('todo', true).label).toBe('Overdue')
  })

  it('даты: порядок дня и месяца зависит от языка', () => {
    expect(formatDate('2026-11-15', 'weekdayDayMonth')).toBe('воскресенье, 15 ноября')
    expect(formatDateRange('2026-11-09', '2026-11-15')).toBe('9–15 ноября')
    setLang('en')
    expect(formatDate('2026-11-15', 'weekdayDayMonth')).toBe('Sunday, November 15')
    expect(formatDateRange('2026-11-09', '2026-11-15')).toBe('Nov 9–15')
  })

  it('диапазон через границу месяца и года', () => {
    expect(formatDateRange('2026-12-28', '2027-01-03')).toBe('28 дек. – 3 янв.')
    setLang('en')
    expect(formatDateRange('2026-12-28', '2027-01-03')).toBe('Dec 28 – Jan 3')
  })
})
