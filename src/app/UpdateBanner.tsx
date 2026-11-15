import { useRegisterSW } from 'virtual:pwa-register/react'
import { t } from '../i18n'

/** Плашка «Доступна новая версия»: новая сборка не подменяет работающую без согласия */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Установленное на «Домой» приложение живёт подолгу — проверяем обновление при каждом возврате в него.
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => {})
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div className="pt-safe px-safe pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center">
      <div
        role="status"
        className="animate-fade-in pointer-events-auto m-2 flex items-center gap-3 rounded-2xl bg-fg py-2 pl-4 pr-2 text-[14px] text-bg shadow-xl"
      >
        <span>{t.app.newVersion}</span>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="h-9 rounded-xl bg-accent px-3 font-semibold text-white active:opacity-70"
        >
          {t.app.update}
        </button>
        <button type="button" onClick={() => setNeedRefresh(false)} className="h-9 px-2 text-bg/70 active:opacity-70">
          {t.app.later}
        </button>
      </div>
    </div>
  )
}
