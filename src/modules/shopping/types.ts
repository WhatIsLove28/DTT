export interface ShoppingList {
  id: string
  name: string
  /** ISO-дата со временем создания; списки идут в порядке создания */
  createdAt: string
}

export interface ShoppingItem {
  id: string
  listId: string
  name: string
  /** Количество как его ввели: «2», «1,5 кг» */
  qty?: string
  done: boolean
  createdAt: string
  /** Когда отметили купленным */
  doneAt?: string
}

/** Что уже покупали — источник подсказок; key — название в нормальной форме */
export interface ShoppingHistoryEntry {
  key: string
  name: string
  count: number
  lastUsedAt: string
}
