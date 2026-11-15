// Язык интерфейса. Как и тема, это настройка устройства: лежит в localStorage и в бэкап не попадает.
// Тексты берутся из словаря `t`; это «живой» экспорт, который меняется при смене языка,
// поэтому читать его нужно в момент показа (внутри компонента или функции), а не в константе модуля.
import { format, type Locale } from 'date-fns'
import { enUS, ru as ruLocale } from 'date-fns/locale'
import { en } from './en'
import { ru, type Dict } from './ru'

export type Lang = 'ru' | 'en'
export type LangSetting = 'system' | Lang
export type { Dict }

/** Названия языков пишутся на самих языках и не переводятся */
export const LANG_NAMES: Record<Lang, string> = { ru: 'Русский', en: 'English' }

const DICTS: Record<Lang, Dict> = { ru, en }
const LOCALES: Record<Lang, Locale> = { ru: ruLocale, en: enUS }
const KEY = 'lang'

export let lang: Lang = 'ru'
export let t: Dict = ru
/** Локаль date-fns для текущего языка */
export let dateLocale: Locale = ruLocale

/** Язык системы: первый подходящий из предпочтений браузера, иначе английский */
export function systemLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const code = tag.toLowerCase().split('-')[0]
    if (code === 'ru' || code === 'en') return code
  }
  return 'en'
}

export function resolveLang(setting: LangSetting): Lang {
  if (setting !== 'system') return setting
  // Вне браузера (тесты) остаётся русский — язык словаря по умолчанию.
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return 'ru'
  return systemLang(navigator.languages?.length ? navigator.languages : [navigator.language ?? ''])
}

export function loadLangSetting(): LangSetting {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === 'ru' || stored === 'en' ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** Переключает словарь и локаль дат; в браузере обновляет lang и заголовок документа */
export function setLang(next: Lang): void {
  lang = next
  t = DICTS[next]
  dateLocale = LOCALES[next]
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next
    document.title = t.app.name
  }
}

/** Запоминает выбор и применяет его; возвращает язык, который получился */
export function saveLangSetting(setting: LangSetting): Lang {
  try {
    if (setting === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, setting)
  } catch {
    // приватный режим: язык просто не запомнится
  }
  const next = resolveLang(setting)
  setLang(next)
  return next
}

type DatePattern = keyof Dict['datePatterns']

const parse = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Дата 'yyyy-MM-dd' по одному из шаблонов текущего языка */
export function formatDate(iso: string, pattern: DatePattern): string {
  return format(parse(iso), t.datePatterns[pattern], { locale: dateLocale })
}

/** Диапазон дат: «9–15 ноября» / «Nov 9–15», через границу месяца — «28 окт. – 3 нояб.» */
export function formatDateRange(startISO: string, endISO: string): string {
  const start = parse(startISO)
  const end = parse(endISO)
  const f = (d: Date, p: string) => format(d, p, { locale: dateLocale })
  if (startISO.slice(0, 7) === endISO.slice(0, 7)) {
    // В русском месяц стоит после числа и склоняется («ноября»), в английском — перед числом.
    const month = lang === 'ru' ? f(end, 'd MMMM').replace(/^\d+\s*/, '') : f(end, 'MMM')
    return t.rangeInMonth(f(start, 'd'), f(end, 'd'), month)
  }
  return `${formatDate(startISO, 'dayShortMonth')} – ${formatDate(endISO, 'dayShortMonth')}`
}
