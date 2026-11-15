import { describe, expect, it } from 'vitest'
import { formatDuration, formatGoalFact, formatGoalTarget, pluralRu } from './format'

describe('pluralRu', () => {
  const forms: [string, string, string] = ['раз', 'раза', 'раз']
  it('выбирает форму по числу', () => {
    expect(pluralRu(1, forms)).toBe('раз')
    expect(pluralRu(2, forms)).toBe('раза')
    expect(pluralRu(5, forms)).toBe('раз')
    expect(pluralRu(11, forms)).toBe('раз')
    expect(pluralRu(12, forms)).toBe('раз')
    expect(pluralRu(22, forms)).toBe('раза')
    expect(pluralRu(21, ['день', 'дня', 'дней'])).toBe('день')
  })
})

describe('formatDuration', () => {
  it('минуты и часы', () => {
    expect(formatDuration(45)).toBe('45 мин')
    expect(formatDuration(60)).toBe('1 ч')
    expect(formatDuration(90)).toBe('1 ч 30 мин')
  })
})

describe('цель и факт', () => {
  it('количество', () => {
    expect(formatGoalTarget('count', 4)).toBe('4 раза в неделю')
    expect(formatGoalFact('count', 2, 4)).toBe('2 / 4')
  })
  it('проценты', () => {
    expect(formatGoalTarget('percent', 80)).toBe('80 %')
    expect(formatGoalFact('percent', 50, 80)).toBe('50 %')
  })
})
