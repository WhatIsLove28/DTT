import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { formatDuration } from '../domain/format'
import { t } from '../i18n'
import { haptic } from './haptics'

const inputBase =
  'h-11 min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] text-fg outline-none placeholder:text-muted focus:border-accent'

export const inputClass = `${inputBase} w-full`

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="pt-3.5">
      <div className="pb-1.5 text-[13px] font-medium text-muted">{label}</div>
      {children}
      {hint && <div className="pt-1.5 text-[13px] text-muted">{hint}</div>}
    </div>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'plain' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const look =
    variant === 'primary'
      ? 'bg-accent text-white'
      : variant === 'danger'
        ? 'bg-st-red/12 text-st-red'
        : 'bg-surface text-fg border border-line'
  return (
    <button
      type="button"
      {...rest}
      className={`flex h-12 w-full items-center justify-center rounded-xl px-4 text-[16px] font-semibold transition-opacity active:opacity-70 disabled:opacity-40 ${look} ${className}`}
    />
  )
}

interface ChipProps {
  selected: boolean
  onClick: () => void
  children: ReactNode
  label?: string
}

/** Строка вариантов в одну линию: не переносится, а листается вбок (до краёв окна) */
export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">{children}</div>
}

export function Chip({ selected, onClick, children, label }: ChipProps) {
  const ref = useRef<HTMLButtonElement>(null)
  // Выбранный вариант подъезжает в видимую часть строки.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [selected])
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[14px] font-medium transition-colors ${
        selected ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-fg'
      }`}
    >
      {children}
    </button>
  )
}

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={`flex rounded-lg bg-line p-0.5 font-medium ${size === 'sm' ? 'text-[13px]' : 'text-[15px]'}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 whitespace-nowrap rounded-md transition-colors ${size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'} ${
            o.value === value ? 'bg-surface text-fg shadow-sm' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 text-left text-[16px]"
    >
      <span>{label}</span>
      <span
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-st-green' : 'bg-line'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  suffix?: string
  label: string
}

/** Числовое поле: пока текст не число в диапазоне, наружу значение не уходит; при потере фокуса поле выравнивается */
export function NumberInput({ value, onChange, min, max, suffix, label }: NumberInputProps) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return (
    <div className="flex items-center gap-2">
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, 4)
          setText(next)
          const n = Number(next)
          if (next !== '' && n >= min && n <= max) onChange(n)
        }}
        onBlur={() => {
          const n = Number(text)
          const fixed = text === '' || Number.isNaN(n) ? value : Math.min(max, Math.max(min, n))
          setText(String(fixed))
          if (fixed !== value) onChange(fixed)
        }}
        className={`${inputBase} w-24 text-center tabular-nums`}
      />
      {suffix && <span className="text-[15px] text-muted">{suffix}</span>}
    </div>
  )
}

/** Необязательное время 'HH:mm'; пустое поле подписано «не задано», заполненное можно сбросить */
export function TimeInput({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="time"
          aria-label={t.fields.startTime}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={`${inputBase} w-36 ${value ? '' : 'text-transparent'}`}
        />
        {!value && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[16px] text-muted">
            {t.fields.notSet}
          </span>
        )}
      </div>
      {value && (
        <button type="button" onClick={() => onChange(undefined)} className="h-11 px-2 text-[15px] text-accent">
          {t.fields.clear}
        </button>
      )}
    </div>
  )
}

const RULER_STEP_MIN = 5
const RULER_MIN = 5
const RULER_MAX = 480
const RULER_STEP_PX = 11
const RULER_TICKS = (RULER_MAX - RULER_MIN) / RULER_STEP_MIN + 1

const clampIndex = (i: number) => Math.max(0, Math.min(RULER_TICKS - 1, i))
const minutesToIndex = (minutes: number) => clampIndex(Math.round((minutes - RULER_MIN) / RULER_STEP_MIN))

/** Подпись над делением: «30», «1 ч», «1:30» */
function rulerLabel(minutes: number): string {
  if (minutes < 60) return String(minutes)
  return minutes % 60 === 0 ? t.fields.rulerHours(minutes / 60) : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

/**
 * Длительность: линейка с делениями по 5 минут, как у таймера iOS. Листается пальцем и
 * прилипает к делениям; тап по значению справа открывает ввод точного числа.
 */
export function DurationInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  // Последнее значение, которое выдала сама линейка: всё остальное — правка извне.
  const emitted = useRef<number | null>(null)
  // Пока пользователь не коснулся линейки, её прокрутка (в том числе наша собственная) значение не меняет:
  // иначе точное «12 мин» само округлилось бы до ближайшего деления.
  const touched = useRef(false)
  const [typing, setTyping] = useState(false)
  const index = minutesToIndex(value)

  useLayoutEffect(() => {
    if (typing || emitted.current === value || !scroller.current) return
    touched.current = false
    scroller.current.scrollLeft = index * RULER_STEP_PX
  }, [value, index, typing])

  const onScroll = () => {
    if (!touched.current || !scroller.current) return
    const next = RULER_MIN + clampIndex(Math.round(scroller.current.scrollLeft / RULER_STEP_PX)) * RULER_STEP_MIN
    if (next === value) return
    emitted.current = next
    haptic()
    onChange(next)
  }
  const touch = () => {
    touched.current = true
  }

  if (typing) {
    return (
      <div className="flex h-[58px] items-center gap-3">
        <NumberInput label={t.fields.durationInMinutes}
          value={value}
          onChange={onChange}
          min={1}
          max={1440}
          suffix={t.fields.minutesSuffix}
        />
        <button
          type="button"
          onClick={() => {
            emitted.current = null
            setTyping(false)
          }}
          className="h-11 px-2 text-[15px] font-medium text-accent"
        >
          {t.common.done}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface pr-1">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scroller}
          role="slider"
          aria-label={t.fields.duration}
          aria-valuemin={RULER_MIN}
          aria-valuemax={RULER_MAX}
          aria-valuenow={value}
          aria-valuetext={formatDuration(value)}
          onScroll={onScroll}
          onTouchStart={touch}
          onPointerDown={touch}
          onWheel={touch}
          className="ruler-fade no-scrollbar flex h-[56px] snap-x snap-mandatory overflow-x-auto"
        >
          <div className="shrink-0" style={{ width: `calc(50% - ${RULER_STEP_PX / 2}px)` }} />
          {Array.from({ length: RULER_TICKS }, (_, i) => {
            const minutes = RULER_MIN + i * RULER_STEP_MIN
            const major = minutes % 30 === 0
            return (
              <div
                key={i}
                className="relative flex shrink-0 snap-center flex-col items-center justify-end pb-3"
                style={{ width: RULER_STEP_PX }}
              >
                {major && (
                  <span
                    className={`absolute top-1.5 whitespace-nowrap text-[11px] font-medium tabular-nums ${
                      i <= index ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {rulerLabel(minutes)}
                  </span>
                )}
                <span
                  className={`w-[2px] rounded-full ${major ? 'h-5' : 'h-3.5'} ${i <= index ? 'bg-accent' : 'bg-muted/45'}`}
                />
              </div>
            )
          })}
          <div className="shrink-0" style={{ width: `calc(50% - ${RULER_STEP_PX / 2}px)` }} />
        </div>
        {/* Указатель текущего значения */}
        <span className="pointer-events-none absolute bottom-0.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[7px] border-x-transparent border-b-accent" />
      </div>
      <button
        type="button"
        aria-label={t.fields.durationExact(formatDuration(value))}
        onClick={() => setTyping(true)}
        className="h-12 w-[88px] shrink-0 rounded-lg text-center text-[18px] font-semibold tabular-nums leading-tight text-accent active:opacity-60"
      >
        {formatDuration(value)}
      </button>
    </div>
  )
}
