// Общие единицы приложения: валюта и система мер. Это часть данных пользователя:
// хранится в meta и попадает в бэкап, чтобы суммы после восстановления читались так же.
import { useLiveQuery } from 'dexie-react-hooks'
import { metaRepo } from '../db/repositories'
import type { Lang } from '../i18n'

/** Коды ISO 4217, которые можно выбрать в настройках */
export const CURRENCIES = [
  'RUB',
  'USD',
  'EUR',
  'UZS',
  'KZT',
  'BYN',
  'UAH',
  'GBP',
  'TRY',
  'GEL',
  'AMD',
  'AZN',
  'KGS',
  'AED',
  'CNY',
] as const

export type Currency = (typeof CURRENCIES)[number]

const KEY = 'currency'

export const defaultCurrency = (lang: Lang): Currency => (lang === 'ru' ? 'RUB' : 'USD')

export function normalizeCurrency(value: unknown, lang: Lang): Currency {
  return CURRENCIES.find((c) => c === value) ?? defaultCurrency(lang)
}

/** Выбранная валюта; пока не выбрана — по языку интерфейса. undefined, пока база читается */
export function useCurrency(lang: Lang): Currency | undefined {
  return useLiveQuery(async () => normalizeCurrency(await metaRepo.get<unknown>(KEY), lang), [lang])
}

export async function setCurrency(currency: Currency): Promise<void> {
  await metaRepo.set(KEY, currency)
}

/** Система мер: килограммы и километры или фунты и мили */
export type UnitSystem = 'metric' | 'imperial'

const UNIT_SYSTEM = 'unitSystem'

export function normalizeUnitSystem(value: unknown): UnitSystem {
  return value === 'imperial' ? 'imperial' : 'metric'
}

/** Выбранная система мер; undefined, пока база читается. Смена только меняет подписи, числа не пересчитываются */
export function useUnitSystem(): UnitSystem | undefined {
  return useLiveQuery(async () => normalizeUnitSystem(await metaRepo.get<unknown>(UNIT_SYSTEM)), [])
}

export async function setUnitSystem(system: UnitSystem): Promise<void> {
  await metaRepo.set(UNIT_SYSTEM, system)
}
