import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ensureDefaults } from './db/actions'
import { runSync } from './db/sync'
import './index.css'

async function prepareData() {
  if (import.meta.env.DEV) {
    const { seedIfRequested } = await import('./dev/seed')
    await seedIfRequested()
  }
  await ensureDefaults()
  await runSync()
}

prepareData().catch((error) => console.error('Не удалось подготовить данные', error))

// Просим систему не вычищать базу при нехватке места. Отказ не ошибка: от потери данных страхует бэкап.
void navigator.storage?.persist?.().catch(() => false)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
