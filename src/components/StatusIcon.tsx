import type { StatusGlyph, StatusTone, StatusView } from '../domain/statusView'
import { t } from '../i18n'

const TONE_COLOR: Record<StatusTone, string> = {
  gray: 'var(--st-gray)',
  yellow: 'var(--st-yellow)',
  green: 'var(--st-green)',
  red: 'var(--st-red)',
}

function Glyph({ glyph, color }: { glyph: StatusGlyph; color: string }) {
  const ring = <circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="2" />
  const mark = { fill: 'none', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  switch (glyph) {
    case 'empty':
      return ring
    case 'half':
      return (
        <>
          {ring}
          <path d="M12 5.5a6.5 6.5 0 0 1 0 13z" fill={color} />
        </>
      )
    case 'check':
      return (
        <>
          <circle cx="12" cy="12" r="10.5" fill={color} />
          <path d="M7.5 12.5l3 3 6-6.5" stroke="var(--surface)" {...mark} />
        </>
      )
    case 'alert':
      return (
        <>
          {ring}
          <path d="M12 7v6" stroke={color} {...mark} />
          <circle cx="12" cy="16.6" r="1.3" fill={color} />
        </>
      )
    case 'cross':
      return (
        <>
          {ring}
          <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke={color} {...mark} />
        </>
      )
  }
}

interface StatusIconProps {
  view: StatusView
  /** Если задан — иконка становится кнопкой с зоной нажатия 44×44 */
  onTap?: () => void
}

export function StatusIcon({ view, onTap }: StatusIconProps) {
  const svg = (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <Glyph glyph={view.glyph} color={TONE_COLOR[view.tone]} />
    </svg>
  )
  if (!onTap) {
    return (
      <span role="img" aria-label={view.label} className="flex h-11 w-11 shrink-0 items-center justify-center">
        {svg}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-label={t.status.aria(view.label)}
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:opacity-60"
    >
      {svg}
    </button>
  )
}
