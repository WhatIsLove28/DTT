import { describe, expect, it } from 'vitest'
import { bumpHistory, nameKey, parseShoppingInput, splitItems, suggest, toggleItem, upsertItem } from './domain'
import type { ShoppingHistoryEntry, ShoppingItem } from './types'

const T1 = '2026-11-15T10:00:00'
const T2 = '2026-11-15T11:00:00'
const T3 = '2026-11-15T12:00:00'

const item = (over: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 'i1',
  listId: 'l1',
  name: 'Молоко',
  done: false,
  createdAt: T1,
  ...over,
})

const entry = (name: string, count: number, lastUsedAt = T1): ShoppingHistoryEntry => ({
  key: nameKey(name),
  name,
  count,
  lastUsedAt,
})

describe('разбор ввода', () => {
  it('отделяет количество в конце строки', () => {
    expect(parseShoppingInput('молоко 2')).toEqual({ name: 'молоко', qty: '2' })
    expect(parseShoppingInput('  сыр   1,5 кг ')).toEqual({ name: 'сыр', qty: '1,5 кг' })
    expect(parseShoppingInput('яйца 10шт')).toEqual({ name: 'яйца', qty: '10шт' })
    expect(parseShoppingInput('батарейки AA 4')).toEqual({ name: 'батарейки AA', qty: '4' })
  })

  it('без количества возвращает только название', () => {
    expect(parseShoppingInput('хлеб')).toEqual({ name: 'хлеб' })
    expect(parseShoppingInput('7 up')).toEqual({ name: '7 up' })
    expect(parseShoppingInput('2')).toEqual({ name: '2' })
  })

  it('пустой ввод не даёт позиции', () => {
    expect(parseShoppingInput('')).toBeUndefined()
    expect(parseShoppingInput('   ')).toBeUndefined()
  })

  it('нормальная форма не зависит от регистра, пробелов и ё', () => {
    expect(nameKey('  Зелёный   Чай ')).toBe('зеленый чай')
  })
})

describe('добавление позиции', () => {
  it('новая позиция', () => {
    expect(upsertItem(undefined, 'l1', { name: 'Хлеб', qty: '2' }, T1, 'x')).toEqual({
      id: 'x',
      listId: 'l1',
      name: 'Хлеб',
      qty: '2',
      done: false,
      createdAt: T1,
    })
    expect(upsertItem(undefined, 'l1', { name: 'Хлеб' }, T1, 'x')).not.toHaveProperty('qty')
  })

  it('повтор некупленной позиции обновляет количество, а не создаёт вторую', () => {
    const result = upsertItem(item({ qty: '1' }), 'l1', { name: 'молоко', qty: '3' }, T2, 'x')
    expect(result).toMatchObject({ id: 'i1', qty: '3', done: false, createdAt: T1 })
  })

  it('повтор без количества сохраняет прежнее', () => {
    expect(upsertItem(item({ qty: '1' }), 'l1', { name: 'молоко' }, T2, 'x').qty).toBe('1')
  })

  it('купленная позиция возвращается в конец списка', () => {
    const result = upsertItem(item({ done: true, doneAt: T2 }), 'l1', { name: 'молоко' }, T3, 'x')
    expect(result).toMatchObject({ id: 'i1', done: false, createdAt: T3 })
    expect(result).not.toHaveProperty('doneAt')
  })
})

describe('отметка и порядок', () => {
  it('отметка ставит время покупки, снятие — убирает', () => {
    const bought = toggleItem(item(), T2)
    expect(bought).toMatchObject({ done: true, doneAt: T2 })
    const back = toggleItem(bought, T3)
    expect(back.done).toBe(false)
    expect(back).not.toHaveProperty('doneAt')
  })

  it('некупленное по порядку добавления, купленное — последнее сверху', () => {
    const { todo, done } = splitItems([
      item({ id: 'b', createdAt: T2 }),
      item({ id: 'a', createdAt: T1 }),
      item({ id: 'd1', done: true, doneAt: T1 }),
      item({ id: 'd2', done: true, doneAt: T3 }),
    ])
    expect(todo.map((i) => i.id)).toEqual(['a', 'b'])
    expect(done.map((i) => i.id)).toEqual(['d2', 'd1'])
  })
})

describe('подсказки', () => {
  const history = [entry('Хлеб', 5), entry('Молоко', 9), entry('Масло', 2), entry('Томаты', 2, T3), entry('Мороженое', 1)]

  it('без запроса — самые частые, при равенстве — недавние', () => {
    expect(suggest(history, '', new Set()).map((e) => e.name)).toEqual(['Молоко', 'Хлеб', 'Томаты', 'Масло', 'Мороженое'])
  })

  it('не предлагает то, что уже ждёт покупки', () => {
    expect(suggest(history, '', new Set(['молоко'])).map((e) => e.name)).not.toContain('Молоко')
  })

  it('с запросом — сначала начинающиеся с него, затем содержащие', () => {
    expect(suggest(history, 'мо', new Set()).map((e) => e.name)).toEqual(['Молоко', 'Мороженое'])
    expect(suggest(history, 'ма', new Set()).map((e) => e.name)).toEqual(['Масло', 'Томаты'])
  })

  it('количество в запросе не мешает поиску, точное совпадение не предлагается', () => {
    expect(suggest(history, 'мол 2', new Set()).map((e) => e.name)).toEqual(['Молоко'])
    expect(suggest(history, 'Хлеб', new Set())).toEqual([])
  })

  it('ограничивает число подсказок', () => {
    expect(suggest(history, '', new Set(), 2)).toHaveLength(2)
  })

  it('история считает добавления', () => {
    const first = bumpHistory(undefined, 'Зелёный чай', T1)
    expect(first).toEqual({ key: 'зеленый чай', name: 'Зелёный чай', count: 1, lastUsedAt: T1 })
    expect(bumpHistory(first, 'зеленый чай', T2)).toMatchObject({ count: 2, lastUsedAt: T2, name: 'зеленый чай' })
  })
})
