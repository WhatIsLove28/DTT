import { useEffect } from 'react'
import { AppShell } from './app/AppShell'
import { UpdateBanner } from './app/UpdateBanner'
import { useAppData } from './db/hooks'
import { runSync } from './db/sync'
import { toISODate } from './domain/dates'
import { SettingsScreen } from './screens/SettingsScreen'
import { Sheets } from './sheets/Sheets'
import { useUiStore } from './store/uiStore'

/** Следит за сменой суток: при возврате в приложение и раз в полминуты сверяет дату и догенерирует задачи */
function useDayWatcher() {
  const setToday = useUiStore((s) => s.setToday)
  useEffect(() => {
    const check = () => {
      const now = toISODate(new Date())
      if (now === useUiStore.getState().today) return
      setToday(now)
      runSync(now).catch((error) => console.error('Не удалось обновить задачи', error))
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    const timer = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [setToday])
}

export function App() {
  const settingsOpen = useUiStore((s) => s.settingsOpen)
  // Подписка на язык: при его смене перерисовывается всё дерево и тексты берутся из нового словаря.
  useUiStore((s) => s.lang)
  const data = useAppData()
  useDayWatcher()
  return (
    <>
      <AppShell data={data} />
      {settingsOpen && <SettingsScreen data={data} />}
      {data && <Sheets data={data} />}
      <UpdateBanner />
    </>
  )
}
