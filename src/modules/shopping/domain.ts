// Логика списка покупок — чистые функции без обращения к базе.
import type { ShoppingHistoryEntry, ShoppingItem } from './types'

export interface ParsedInput {
  name: string
  qty?: string
}

/** Число в конце строки, с необязательной короткой единицей: «2», «1,5 кг», «10 шт» */
const TRAILING_QTY = /^(.*\S)\s+(\d+(?:[.,]\d+)?(?:\s?[^\d\s]{1,5})?)$/u

/** Разбирает ввод «молоко 2» на название и количество; пустая строка даёт undefined */
export function parseShoppingInput(text: string): ParsedInput | undefined {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return undefined
  const match = TRAILING_QTY.exec(clean)
  return match ? { name: match[1], qty: match[2] } : { name: clean }
}

/** Нормальная форма названия: по ней сравниваются позиции и ведётся история */
export function nameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase().replace(/ё/g, 'е')
}

/**
 * Что записать при добавлении позиции. Если такая уже есть в списке, второй она не становится:
 * купленная возвращается в список, у некупленной обновляется количество.
 */
export function upsertItem(
  existing: ShoppingItem | undefined,
  listId: string,
  input: ParsedInput,
  now: string,
  id: string,
): ShoppingItem {
  if (!existing) {
    return { id, listId, name: input.name, ...(input.qty ? { qty: input.qty } : {}), done: false, createdAt: now }
  }
  const { doneAt: _doneAt, ...rest } = existing
  const qty = input.qty ?? existing.qty
  return {
    ...rest,
    ...(qty ? { qty } : {}),
    done: false,
    // Возвращённая позиция встаёт в конец списка, как только что добавленная.
    createdAt: existing.done ? now : existing.createdAt,
  }
}

/** Отметка «куплено» и обратно */
export function toggleItem(item: ShoppingItem, now: string): ShoppingItem {
  const { doneAt: _doneAt, ...rest } = item
  return item.done ? { ...rest, done: false } : { ...rest, done: true, doneAt: now }
}

/** Запись истории после добавления позиции */
export function bumpHistory(
  entry: ShoppingHistoryEntry | undefined,
  name: string,
  now: string,
): ShoppingHistoryEntry {
  return { key: nameKey(name), name, count: (entry?.count ?? 0) + 1, lastUsedAt: now }
}

/** Некупленное — в порядке добавления; купленное — последнее отмеченное сверху */
export function splitItems(items: readonly ShoppingItem[]): { todo: ShoppingItem[]; done: ShoppingItem[] } {
  const todo = items.filter((i) => !i.done).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const done = items.filter((i) => i.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  return { todo, done }
}

/**
 * Подсказки из истории. Без запроса — самые частые; с запросом — совпадения, причём
 * начинающиеся с запроса идут первыми. То, что уже ждёт покупки в списке, не предлагается.
 */
export function suggest(
  history: readonly ShoppingHistoryEntry[],
  query: string,
  todoKeys: ReadonlySet<string>,
  limit = 8,
): ShoppingHistoryEntry[] {
  const q = nameKey(parseShoppingInput(query)?.name ?? '')
  const rank = (e: ShoppingHistoryEntry) => (q && e.key.startsWith(q) ? 0 : 1)
  return history
    .filter((e) => !todoKeys.has(e.key) && (!q || e.key.includes(q)) && e.key !== q)
    .sort(
      (a, b) => rank(a) - rank(b) || b.count - a.count || b.lastUsedAt.localeCompare(a.lastUsedAt) || a.key.localeCompare(b.key),
    )
    .slice(0, limit)
}
