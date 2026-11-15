import { BarbellIcon } from '../../components/icons'
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
      onClick={(e) => {
        e.stopPropagation()
        onOpen('start')
      }}
      className={`flex h-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 px-3 text-[14px] font-semibold text-accent active:opacity-60 ${
        wide ? '' : 'mt-2.5 w-full'
      }`}
    >
      {active ? t.workouts.continueShort : t.workouts.startShort}
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
      className={`flex min-w-0 rounded-xl bg-surface text-left active:opacity-80 ${
        wide ? 'col-span-2 items-center gap-3 py-2 pl-4 pr-2' : 'flex-col p-3'
      }`}
    >
      {wide ? (
        <>
          <span className="shrink-0 text-accent">
            <BarbellIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-muted">{t.workouts.title}</span>
            <span className="block truncate text-[16px]">{t.workouts.tileWeek(count)}</span>
          </span>
          {startButton}
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <span className="flex scale-75 text-accent">
              <BarbellIcon />
            </span>
            {t.workouts.title}
          </span>
          <span className="pt-1 text-[22px] font-semibold tabular-nums leading-tight">{count}</span>
          <span className="truncate text-[13px] text-muted">{t.workouts.thisWeekShort}</span>
          <span className="flex-1" />
          {startButton}
        </>
      )}
    </div>
  )
}
