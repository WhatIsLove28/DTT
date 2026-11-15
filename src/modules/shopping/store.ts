// Данные модуля «Покупки»: живое чтение и действия (одна транзакция на действие).
// Экран и плитка обращаются к базе только через этот файл.
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '../../db/db'
import { newId } from '../../domain/ids'
import { bumpHistory, nameKey, parseShoppingInput, toggleItem, upsertItem } from './domain'
import type { ShoppingHistoryEntry, ShoppingItem, ShoppingList } from './types'

const nowStamp = (): string => format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS")

const TABLES = [db.shoppingLists, db.shoppingItems, db.shoppingHistory]

export interface ShoppingData {
  /** В порядке создания */
  lists: ShoppingList[]
  items: ShoppingItem[]
  history: ShoppingHistoryEntry[]
}

/** Живые данные модуля; undefined, пока база читается */
export function useShopping(): ShoppingData | undefined {
  return useLiveQuery(async () => {
    const [lists, items, history] = await Promise.all([
      db.shoppingLists.toArray(),
      db.shoppingItems.toArray(),
      db.shoppingHistory.toArray(),
    ])
    lists.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return { lists, items, history }
  }, [])
}

/** Создаёт первый список, если списков ещё нет; повторный вызов ничего не делает */
export async function ensureDefaultList(name: string): Promise<void> {
  await db.transaction('rw', TABLES, async () => {
    if ((await db.shoppingLists.count()) === 0) {
      await db.shoppingLists.put({ id: newId(), name, createdAt: nowStamp() })
    }
  })
}

export async function createList(name: string): Promise<string> {
  const list: ShoppingList = { id: newId(), name: name.trim(), createdAt: nowStamp() }
  await db.shoppingLists.put(list)
  return list.id
}

export async function renameList(list: ShoppingList, name: string): Promise<void> {
  await db.shoppingLists.put({ ...list, name: name.trim() })
}

/** Удаляет список вместе с его позициями; история подсказок остаётся */
export async function deleteList(id: string): Promise<void> {
  await db.transaction('rw', TABLES, async () => {
    await db.shoppingItems.where('listId').equals(id).delete()
    await db.shoppingLists.delete(id)
  })
}

/** Добавляет позицию из строки ввода («молоко 2»); пустой ввод игнорируется */
export async function addItem(listId: string, text: string): Promise<void> {
  const input = parseShoppingInput(text)
  if (!input) return
  const key = nameKey(input.name)
  const now = nowStamp()
  await db.transaction('rw', TABLES, async () => {
    const inList = await db.shoppingItems.where('listId').equals(listId).toArray()
    const existing = inList.find((i) => nameKey(i.name) === key)
    await db.shoppingItems.put(upsertItem(existing, listId, input, now, newId()))
    await db.shoppingHistory.put(bumpHistory(await db.shoppingHistory.get(key), input.name, now))
  })
}

export async function toggleShoppingItem(item: ShoppingItem): Promise<void> {
  await db.shoppingItems.put(toggleItem(item, nowStamp()))
}

export async function deleteItem(id: string): Promise<void> {
  await db.shoppingItems.delete(id)
}

/** Убирает из списка всё купленное */
export async function clearDone(listId: string): Promise<void> {
  await db.shoppingItems
    .where('listId')
    .equals(listId)
    .filter((i) => i.done)
    .delete()
}
