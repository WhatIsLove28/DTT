import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { t } from '../i18n'

interface SwipeRowProps {
  children: ReactNode
  /** Свайп вправо до упора; без обработчика жест вправо отключён */
  onDone?: () => void
  onSkip?: () => void
  onDelete: () => void
}

const ACTION_W = 84
const DONE_THRESHOLD = 84

/**
 * Строка со свайпом: вправо — «Выполнено», влево — открываются кнопки «Пропустить» и «Удалить».
 * data-no-embla сообщает карусели экранов, что горизонтальный жест здесь занят.
 */
export function SwipeRow({ children, onDone, onSkip, onDelete }: SwipeRowProps) {
  const actionsWidth = ACTION_W * (onSkip ? 2 : 1)
  const [dx, setDxState] = useState(0)
  const [dragging, setDraggingState] = useState(false)
  // Копии в ref: обработчики жеста должны видеть свежие значения, не дожидаясь перерисовки.
  const dxRef = useRef(0)
  const draggingRef = useRef(false)
  const start = useRef<{ x: number; y: number; base: number } | null>(null)
  const moved = useRef(false)

  const setDx = (value: number) => {
    dxRef.current = value
    setDxState(value)
  }
  const setDragging = (value: boolean) => {
    draggingRef.current = value
    setDraggingState(value)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, base: dxRef.current }
    moved.current = false
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s) return
    const ddx = e.clientX - s.x
    const ddy = e.clientY - s.y
    if (!draggingRef.current) {
      if (Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)) {
        start.current = null // вертикальная прокрутка
        return
      }
      if (Math.abs(ddx) < 10) return
      setDragging(true)
      moved.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const max = onDone ? 140 : 0
    setDx(Math.max(-actionsWidth - 24, Math.min(max, s.base + ddx)))
  }

  const finish = (cancelled: boolean) => {
    if (!start.current) return
    start.current = null
    if (!draggingRef.current) return
    const dx = dxRef.current
    setDragging(false)
    if (cancelled) return setDx(0)
    if (dx >= DONE_THRESHOLD && onDone) {
      setDx(0)
      onDone()
    } else if (dx <= -actionsWidth / 2) {
      setDx(-actionsWidth)
    } else {
      setDx(0)
    }
  }

  const act = (fn: () => void) => () => {
    setDx(0)
    fn()
  }

  return (
    <div data-no-embla className="relative overflow-hidden rounded-xl" style={{ touchAction: 'pan-y' }}>
      {dx > 0 && (
        <div className="absolute inset-0 flex items-center bg-st-green pl-4 text-[15px] font-semibold text-white">
          {dx >= DONE_THRESHOLD ? t.task.releaseToDone : t.task.markDone}
        </div>
      )}
      {dx < 0 && (
        <div className="absolute inset-y-0 right-0 flex text-[13px] font-semibold text-white">
          {onSkip && (
            <button type="button" onClick={act(onSkip)} style={{ width: ACTION_W }} className="bg-st-gray">
              {t.task.skip}
            </button>
          )}
          <button type="button" onClick={act(onDelete)} style={{ width: ACTION_W }} className="bg-st-red">
            {t.common.delete}
          </button>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => finish(false)}
        onPointerCancel={() => finish(true)}
        onClickCapture={(e) => {
          // Тап после жеста или по открытой строке не должен открывать редактор.
          if (moved.current) {
            moved.current = false
          } else if (dxRef.current !== 0) {
            setDx(0)
          } else {
            return
          }
          e.stopPropagation()
          e.preventDefault()
        }}
        className={dragging ? '' : 'transition-transform duration-200'}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
