import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import { CloseIcon } from './icons'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * Модальное окно снизу. Закрывается тапом по фону, кнопкой и клавишей Escape.
 * Рисуется порталом в body: внутри карусели экранов fixed-позиционирование и жесты ломаются.
 */
export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end text-fg"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet-up px-safe relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-40px)] flex-col rounded-t-2xl bg-bg shadow-2xl">
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted/40" />
        <div className="flex shrink-0 items-center justify-between pl-4 pr-1">
          <h2 className="truncate text-[17px] font-semibold">{title}</h2>
          <button
            type="button"
            aria-label={t.common.close}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center text-muted active:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        <div className="pb-safe shrink-0" />
      </div>
    </div>,
    document.body,
  )
}
