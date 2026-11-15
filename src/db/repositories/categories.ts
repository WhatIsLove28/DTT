import type { Category } from '../../domain/types'
import { db } from '../db'

export const categoriesRepo = {
  list: (): Promise<Category[]> => db.categories.toArray(),
  get: (id: string): Promise<Category | undefined> => db.categories.get(id),
  put: (category: Category): Promise<string> => db.categories.put(category),
  remove: (id: string): Promise<void> => db.categories.delete(id),
}
