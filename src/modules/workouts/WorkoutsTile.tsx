import { BarbellIcon, PlayIcon } from '../../components/icons'
import { weekStartOf } from '../../domain/dates'
import { t } from '../../i18n'
import { useUiStore } from '../../store/uiStore'
import { activeWorkout, workoutsInWeek } from './domain'
import { useWorkouts } from './store'

/** Плитка на главном экране: тренировки за неделю и быстрый старт */
export function WorkoutsTile({ wide, onOpen }: { wide: boolean; onOpen: (intent?: string) => void }) {
  const today = useUiStore((s) => s.today)
  const data = useWorkouts()
  const count = data ? workoutsInWeek(data.workouts, weekStartOf(today)) : 0
  const active = data ? activeWorkout(data.workouts) : undefined

  const startButton = (
    <button
      type="button"
      aria-label={active ? t.workouts.continue : t.workouts.start}
      onClick={(e) => {
        e.stopPropagation()
        onOpen('start')
      }}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:opacity-60 ${
        active ? 'bg-accent text-white' : 'bg-accent/12 text-accent'
      }`}
    >
      <PlayIcon />
    </button>
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
      }}
      className={`flex min-w-0 items-center gap-2 rounded-xl bg-surface text-left active:opacity-80 ${
        wide ? 'col-span-2 min-h-14 py-2 pl-4 pr-2.5' : 'py-2.5 pl-3 pr-2.5'
      }`}
    >
      {wide && (
        <span className="shrink-0 pr-1 text-accent">
          <BarbellIcon />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[13px] text-muted">
          {!wide && (
            <span className="-ml-1 flex scale-[0.65] text-accent">
              <BarbellIcon />
            </span>
          )}
          {t.workouts.title}
        </span>
        <span className="block truncate text-[19px] font-semibold tabular-nums leading-tight">{count}</span>
        <span className="block truncate text-[12px] text-muted">
          {active ? t.workouts.activeTitle : t.workouts.thisWeekShort}
        </span>
      </span>
      {startButton}
    </div>
  )
}
