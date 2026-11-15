import { db } from '../db'

export const metaRepo = {
  get: async <T>(key: string): Promise<T | undefined> => (await db.meta.get(key))?.value as T | undefined,
  set: async (key: string, value: unknown): Promise<void> => {
    await db.meta.put({ key, value })
  },
}
