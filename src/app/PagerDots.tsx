import { t } from '../i18n'

interface PagerDotsProps {
  labels: string[]
  active: number
  onSelect: (index: number) => void
}

export function PagerDots({ labels, active, onSelect }: PagerDotsProps) {
  return (
    <nav className="pb-safe shrink-0" aria-label={t.app.screensNav}>
      <div className="flex justify-center">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-current={i === active ? 'page' : undefined}
            onClick={() => onSelect(i)}
            className="flex h-8 w-8 items-center justify-center"
          >
            <span
              className={`h-2 rounded-full transition-all duration-200 ${
                i === active ? 'w-5 bg-fg' : 'w-2 bg-muted/50'
              }`}
            />
          </button>
        ))}
      </div>
    </nav>
  )
}
