// Тема оформления: системная, светлая или тёмная. Это настройка устройства, а не данные,
// поэтому лежит в localStorage и в бэкап не попадает.
export type Theme = 'system' | 'light' | 'dark'

const KEY = 'theme'
const BG = { light: '#f2f2f7', dark: '#000000' } as const

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** Применяет тему к документу: атрибут data-theme для CSS и цвет статус-бара */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)

  // В index.html два тега theme-color — для светлой и тёмной системной темы.
  // При принудительной теме оба получают один цвет.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const systemDark = (meta.media ?? '').includes('dark')
    meta.content = BG[theme === 'system' ? (systemDark ? 'dark' : 'light') : theme]
  })
}

export function saveTheme(theme: Theme): void {
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // приватный режим: тема просто не запомнится
  }
  applyTheme(theme)
}
