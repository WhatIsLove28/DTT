import { create } from 'zustand'
import { applyTheme, loadTheme, saveTheme, type Theme } from '../app/theme'
import { toISODate } from '../domain/dates'
import type { ISODate, Task, WeeklyGoal } from '../domain/types'
import type { ModuleId } from '../modules/settings'
import { loadLangSetting, resolveLang, saveLangSetting, setLang, type Lang, type LangSetting } from '../i18n'

export type Sheet =
  /** Редактор задачи; без task — новая задача на дату date */
  | { kind: 'task'; task?: Task; date?: ISODate }
  /** Редактор цели; без goal — новая цель, week — неделя, с которой она начнётся */
  | { kind: 'goal'; goal?: WeeklyGoal; week?: ISODate }
  /** Выбор на экране недели: добавить задачу или цель */
  | { kind: 'addChoice'; date: ISODate; week: ISODate }
  /** «Сколько заняло?» */
  | { kind: 'complete'; task: Task }
  | { kind: 'deleteTask'; task: Task }
  | { kind: 'calendar' }

export type WeekViewMode = 'week' | 'day'

interface UiState {
  /** 0 — главный экран, 1 — экран недели */
  screenIndex: number
  settingsOpen: boolean
  /** Модуль, открытый на весь экран */
  moduleOpen: ModuleId | null
  /** С чем открыть модуль: например 'add' — сразу с окном добавления */
  moduleIntent: string | undefined
  openModule: (id: ModuleId, intent?: string) => void
  closeModule: () => void
  /** Текущий день; обновляется при смене суток и возврате в приложение */
  today: ISODate
  viewMode: WeekViewMode
  /** Дата, выбранная на экране недели */
  selectedDate: ISODate
  sheet: Sheet | null
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Выбор в настройках: конкретный язык или «как в системе» */
  langSetting: LangSetting
  /** Язык, на котором сейчас показан интерфейс; смена перерисовывает приложение */
  lang: Lang
  setLangSetting: (setting: LangSetting) => void
  setScreenIndex: (index: number) => void
  openSettings: () => void
  closeSettings: () => void
  setToday: (today: ISODate) => void
  setViewMode: (mode: WeekViewMode) => void
  setSelectedDate: (date: ISODate) => void
  openSheet: (sheet: Sheet) => void
  closeSheet: () => void
}

const initialToday = toISODate(new Date())
const initialTheme = loadTheme()
applyTheme(initialTheme)
const initialLangSetting = loadLangSetting()
const initialLang = resolveLang(initialLangSetting)
setLang(initialLang)

export const useUiStore = create<UiState>((set) => ({
  screenIndex: 0,
  settingsOpen: false,
  today: initialToday,
  viewMode: 'week',
  selectedDate: initialToday,
  sheet: null,
  theme: initialTheme,
  setTheme: (theme) => {
    saveTheme(theme)
    set({ theme })
  },
  langSetting: initialLangSetting,
  lang: initialLang,
  setLangSetting: (langSetting) => set({ langSetting, lang: saveLangSetting(langSetting) }),
  setScreenIndex: (screenIndex) => set({ screenIndex }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  moduleOpen: null,
  moduleIntent: undefined,
  openModule: (moduleOpen, moduleIntent) => set({ moduleOpen, moduleIntent }),
  closeModule: () => set({ moduleOpen: null, moduleIntent: undefined }),
  setToday: (today) =>
    // Если смотрели «сегодня», после полуночи остаёмся на сегодняшнем дне.
    set((s) => ({ today, selectedDate: s.selectedDate === s.today ? today : s.selectedDate })),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
}))
