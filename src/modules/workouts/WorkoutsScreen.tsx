import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/fields'
import { ChevronRightIcon } from '../../components/icons'
import { useAppData } from '../../db/hooks'
import { weekStartOf } from '../../domain/dates'
import { formatDuration } from '../../domain/format'
import { formatDate, t } from '../../i18n'
import { useUiStore } from '../../store/uiStore'
import { ModuleShell } from '../ModuleShell'
import { allExercises } from './catalog'
import { activeWorkout, workoutStats, workoutsInWeek } from './domain'
import { startWorkout, useWorkouts } from './store'
import { useUnitLabels } from './units'
import type { Workout } from './types'
import { WorkoutView } from './WorkoutView'

export function WorkoutsScreen({ onClose, intent }: { onClose: () => void; intent?: string }) {
  const today = useUiStore((s) => s.today)
  const lang = useUiStore((s) => s.lang)
  const data = useWorkouts()
  const app = useAppData()
  const units = useUnitLabels()
  const [open, setOpen] = useState<Workout | null>(null)

  const exercises = useMemo(() => allExercises(data?.exercises ?? [], lang), [data, lang])
  const active = data ? activeWorkout(data.workouts) : undefined

  /** Продолжает идущую тренировку или начинает новую с целью, выбранной в прошлый раз */
  const start = async () => {
    if (!data) return
    setOpen(active ?? (await startWorkout(t.workouts.defaultName, data.workouts[0]?.goalId)))
  }

  // Быстрое действие плитки: сразу в тренировку. Один раз, когда данные прочитаны.
  const started = useRef(false)
  useEffect(() => {
    if (intent !== 'start' || !data || started.current) return
    started.current = true
    void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, data])

  const ready = data && app && units

  if (open && ready) {
    return (
      <ModuleShell title={open.finishedAt ? t.workouts.workout : t.workouts.activeTitle} onClose={() => setOpen(null)}>
        <WorkoutView
          key={open.id}
          initial={open}
          workouts={data.workouts}
          exercises={exercises}
          goals={app.goals}
          units={units}
          onOpen={setOpen}
          onDone={() => setOpen(null)}
        />
      </ModuleShell>
    )
  }

  const history = data?.workouts.filter((w) => w.finishedAt) ?? []

  return (
    <ModuleShell title={t.workouts.title} onClose={onClose}>
      {ready && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <div className="rounded-xl bg-surface p-4">
              <div className="text-[13px] text-muted">{t.workouts.thisWeek}</div>
              <div className="text-[30px] font-bold tabular-nums leading-tight">
                {workoutsInWeek(data.workouts, weekStartOf(today))}
              </div>
            </div>

            {active && (
              <button
                type="button"
                onClick={() => setOpen(active)}
                className="mt-2 flex min-h-14 w-full items-center gap-3 rounded-xl bg-accent/12 py-2 pl-4 pr-2 text-left active:opacity-70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-accent">{t.workouts.activeTitle}</span>
                  <span className="block truncate text-[16px] font-medium">{active.name || t.workouts.defaultName}</span>
                </span>
                <span className="shrink-0 text-accent">
                  <ChevronRightIcon />
                </span>
              </button>
            )}

            <h2 className="px-1 pb-1.5 pt-4 text-[13px] font-semibold uppercase tracking-wide text-muted">{t.workouts.history}</h2>
            {history.length === 0 ? (
              <div className="rounded-xl bg-surface px-4 py-5 text-center text-[15px] text-muted">{t.workouts.empty}</div>
            ) : (
              <div className="divide-y divide-line rounded-xl bg-surface">
                {history.map((w) => {
                  const stats = workoutStats(w)
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setOpen(w)}
                      className="flex min-h-14 w-full items-center gap-3 py-2 pl-4 pr-2 text-left active:opacity-70"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px]">{w.name || t.workouts.defaultName}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {formatDate(w.date, 'shortWeekdayDayMonth')} · {t.workouts.summary(stats.exercises, stats.sets)}
                          {stats.minutes ? ` · ${formatDuration(stats.minutes)}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-muted/60">
                        <ChevronRightIcon />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 px-3 pt-2">
            <Button onClick={() => void start()}>{active ? t.workouts.continue : t.workouts.start}</Button>
            <div className="pb-safe min-h-3" />
          </div>
        </>
      )}
    </ModuleShell>
  )
}
