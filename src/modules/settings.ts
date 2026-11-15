// Какие модули включены. Это часть данных пользователя: хранится в meta и попадает в бэкап.
import { useLiveQuery } from 'dexie-react-hooks'
import { metaRepo } from '../db/repositories'

export type ModuleId = 'shopping' | 'expenses' | 'workouts'

const KEY = 'modules'
const KNOWN: readonly ModuleId[] = ['shopping', 'expenses', 'workouts']

/** Оставляет только известные модули, без повторов, в сохранённом порядке */
export function normalizeModules(value: unknown): ModuleId[] {
  if (!Array.isArray(value)) return []
  return KNOWN.filter((id) => value.includes(id)).sort((a, b) => value.indexOf(a) - value.indexOf(b))
}

/** Включённые модули в порядке плиток; undefined, пока база читается */
export function useEnabledModules(): ModuleId[] | undefined {
  return useLiveQuery(async () => normalizeModules(await metaRepo.get<unknown>(KEY)), [])
}

export async function setModuleEnabled(id: ModuleId, enabled: boolean): Promise<void> {
  const current = normalizeModules(await metaRepo.get<unknown>(KEY))
  const next = enabled ? [...current.filter((m) => m !== id), id] : current.filter((m) => m !== id)
  await metaRepo.set(KEY, next)
}

/** Сдвигает плитку модуля на одну позицию: delta −1 — выше, +1 — ниже */
export async function moveModule(id: ModuleId, delta: -1 | 1): Promise<void> {
  const current = normalizeModules(await metaRepo.get<unknown>(KEY))
  const from = current.indexOf(id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= current.length) return
  const next = [...current]
  ;[next[from], next[to]] = [next[to], next[from]]
  await metaRepo.set(KEY, next)
}
