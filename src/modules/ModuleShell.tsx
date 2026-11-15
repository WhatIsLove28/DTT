import type { ReactNode } from 'react'
import { ChevronLeftIcon } from '../components/icons'
import { t } from '../i18n'

interface ModuleShellProps {
  title: string
  onClose: () => void
  /** Кнопка справа в шапке */
  action?: ReactNode
  children: ReactNode
}

/** Полноэкранное окно модуля: шапка с «Назад» и прокручиваемое содержимое */
export function ModuleShell({ title, onClose, action, children }: ModuleShellProps) {
  return (
    <div className="animate-fade-in px-safe fixed inset-0 z-40 flex flex-col bg-bg text-fg">
      <header className="pt-safe shrink-0">
        <div className="relative flex h-11 items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-0 flex h-11 items-center pl-1 pr-3 text-[17px] text-accent active:opacity-60"
          >
            <ChevronLeftIcon />
            {t.common.back}
          </button>
          <h1 className="max-w-[50%] truncate text-[17px] font-semibold">{title}</h1>
          {action && <div className="absolute right-0 flex h-11 items-center pr-1">{action}</div>}
        </div>
      </header>
      {children}
    </div>
  )
}
