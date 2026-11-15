import type { Category, Recurrence, RecurrenceType } from '../domain/types'
import { t } from '../i18n'
import { Chip, ChipRow, NumberInput } from './fields'

interface CategoryPickerProps {
  categories: readonly Category[]
  value: string
  onChange: (id: string) => void
}

export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  return (
    <ChipRow>
      {categories.map((c) => (
        <Chip key={c.id} selected={c.id === value} onClick={() => onChange(c.id)}>
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/60" style={{ backgroundColor: c.color }} />
          {c.name}
        </Chip>
      ))}
    </ChipRow>
  )
}

const typeLabel = (type: Exclude<RecurrenceType, 'none'>): string =>
  ({
    daily: t.recurrence.daily,
    every_n_days: t.recurrence.everyNDays,
    weekdays: t.recurrence.weekdays,
    times_per_week: t.recurrence.timesPerWeek,
  })[type]

/** Значения по умолчанию при переключении режима */
function withDefaults(type: RecurrenceType, prev: Recurrence): Recurrence {
  switch (type) {
    case 'every_n_days':
      return { type, interval: prev.interval ?? 2 }
    case 'weekdays':
      return { type, weekdays: prev.weekdays ?? [1, 3, 5] }
    case 'times_per_week':
      return { type, timesPerWeek: prev.timesPerWeek ?? 3 }
    default:
      return { type }
  }
}

interface RecurrencePickerProps {
  value: Recurrence
  onChange: (value: Recurrence) => void
  /** Подпись варианта без расписания */
  noneLabel: string
}

/** Выбор правила повторения — общий для целей и задач */
export function RecurrencePicker({ value, onChange, noneLabel }: RecurrencePickerProps) {
  const types: RecurrenceType[] = ['none', 'daily', 'every_n_days', 'weekdays', 'times_per_week']
  return (
    <div>
      <ChipRow>
        {types.map((type) => (
          <Chip key={type} selected={value.type === type} onClick={() => onChange(withDefaults(type, value))}>
            {type === 'none' ? noneLabel : typeLabel(type)}
          </Chip>
        ))}
      </ChipRow>

      {value.type === 'every_n_days' && (
        <div className="flex items-center gap-2 pt-2.5">
          <span className="text-[15px] text-muted">{t.recurrence.every}</span>
          <NumberInput
            label={t.recurrence.intervalLabel}
            value={value.interval ?? 2}
            onChange={(interval) => onChange({ type: 'every_n_days', interval })}
            min={1}
            max={60}
            suffix={t.recurrence.intervalSuffix}
          />
        </div>
      )}

      {value.type === 'weekdays' && (
        <div className="flex gap-1 pt-2.5">
          {t.recurrence.weekdayButtons.map((name, i) => {
            const day = i + 1
            const days = value.weekdays ?? []
            const selected = days.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onChange({
                    type: 'weekdays',
                    weekdays: selected ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b),
                  })
                }
                className={`h-10 min-w-0 flex-1 rounded-lg border text-[14px] font-medium ${
                  selected ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-fg'
                }`}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}

      {value.type === 'times_per_week' && (
        <div className="pt-2.5">
          <NumberInput
            label={t.recurrence.timesLabel}
            value={value.timesPerWeek ?? 3}
            onChange={(timesPerWeek) => onChange({ type: 'times_per_week', timesPerWeek })}
            min={1}
            max={7}
            suffix={t.recurrence.timesSuffix}
          />
        </div>
      )}
    </div>
  )
}
