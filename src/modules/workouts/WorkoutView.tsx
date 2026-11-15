import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, Field, inputClass } from '../../components/fields'
import { haptic } from '../../components/haptics'
import { CloseIcon, PlusIcon } from '../../components/icons'
import { StatusIcon } from '../../components/StatusIcon'
import { formatDuration } from '../../domain/format'
import { newId } from '../../domain/ids'
import { isGoalActiveOn } from '../../domain/recurrence'
import type { WeeklyGoal } from '../../domain/types'
import { formatDate, t } from '../../i18n'
import {
  exerciseHistory,
  exerciseRecords,
  formatSeconds,
  formatSet,
  initialSets,
  isSetFilled,
  lastPerformance,
  minutesBetween,
  nextSet,
  recentExerciseIds,
  type UnitLabels,
} from './domain'
import { ExercisePicker } from './ExercisePicker'
import { deleteWorkout, finishWorkout, saveWorkout, startRepeat } from './store'
import type { Exercise, ExerciseKind, Workout, WorkoutEntry, WorkoutSet } from './types'

interface NumFieldProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  label: string
  decimal?: boolean
}

/** Маленькое числовое поле подхода; пустое поле — значение не задано */
function NumField({ value, onChange, label, decimal = false }: NumFieldProps) {
  const [text, setText] = useState(value === undefined ? '' : String(value))
  useEffect(() => {
    // Внешнее значение подставляется, только если оно не то же число, что уже набрано («12.» и 12).
    setText((current) => (Number(current.replace(',', '.') || NaN) === value ? current : value === undefined ? '' : String(value)))
  }, [value])
  return (
    <div className="min-w-0 flex-1">
      <input
        aria-label={label}
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={text}
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value.replace(',', '.')
          if (!(decimal ? /^\d{0,5}(\.\d{0,2})?$/ : /^\d{0,5}$/).test(raw)) return
          setText(e.target.value)
          onChange(raw === '' || raw === '.' ? undefined : Number(raw))
        }}
        className="h-10 w-full min-w-0 rounded-lg border border-line bg-bg px-1 text-center text-[16px] tabular-nums text-fg outline-none placeholder:text-muted/50 focus:border-accent"
      />
      <div className="pt-0.5 text-center text-[11px] text-muted">{label}</div>
    </div>
  )
}

function SetFields({
  set,
  kind,
  units,
  onChange,
}: {
  set: WorkoutSet
  kind: ExerciseKind
  units: UnitLabels
  onChange: (set: WorkoutSet) => void
}) {
  /** Обновляет одно поле; неопределённое значение убирает поле из записи */
  const patch = (field: 'weight' | 'reps' | 'seconds' | 'distance', value: number | undefined) => {
    const { [field]: _old, ...rest } = set
    onChange(value === undefined ? rest : { ...rest, [field]: value })
  }
  const minutes = set.seconds === undefined ? undefined : Math.floor(set.seconds / 60)
  const seconds = set.seconds === undefined ? undefined : set.seconds % 60
  const setTime = (min: number | undefined, sec: number | undefined) =>
    patch('seconds', min === undefined && sec === undefined ? undefined : (min ?? 0) * 60 + Math.min(59, sec ?? 0))

  switch (kind) {
    case 'weight_reps':
      return (
        <>
          <NumField label={units.weight} decimal value={set.weight} onChange={(v) => patch('weight', v)} />
          <NumField label={t.workouts.reps} value={set.reps} onChange={(v) => patch('reps', v)} />
        </>
      )
    case 'reps':
      return <NumField label={t.workouts.reps} value={set.reps} onChange={(v) => patch('reps', v)} />
    case 'time':
      return (
        <>
          <NumField label={t.workouts.min} value={minutes} onChange={(v) => setTime(v, seconds)} />
          <NumField label={t.workouts.sec} value={seconds} onChange={(v) => setTime(minutes, v)} />
        </>
      )
    case 'distance':
      return (
        <>
          <NumField label={units.distance} decimal value={set.distance} onChange={(v) => patch('distance', v)} />
          <NumField label={t.workouts.min} value={minutes} onChange={(v) => setTime(v, undefined)} />
        </>
      )
  }
}

function ExerciseInfo({
  exercise,
  workouts,
  units,
}: {
  exercise: Exercise
  workouts: readonly Workout[]
  units: UnitLabels
}) {
  const records = exerciseRecords(workouts, exercise.id, exercise.kind)
  const sessions = exerciseHistory(workouts, exercise.id)
  const rows: [string, string][] = []
  if (records.maxWeight) rows.push([t.workouts.recMaxWeight, formatSet({ ...records.maxWeight, done: true }, 'weight_reps', units)])
  if (records.best1RM) rows.push([t.workouts.rec1RM, `${records.best1RM} ${units.weight}`])
  if (records.maxReps) rows.push([t.workouts.recMaxReps, String(records.maxReps)])
  if (records.maxDistance) rows.push([t.workouts.recMaxDistance, `${records.maxDistance} ${units.distance}`])
  if (records.maxSeconds) rows.push([t.workouts.recMaxTime, formatSeconds(records.maxSeconds)])

  if (sessions.length === 0) return <p className="py-4 text-center text-[15px] text-muted">{t.workouts.noHistory}</p>

  return (
    <div>
      <div className="pb-1.5 pt-1 text-[13px] font-medium text-muted">{t.workouts.records}</div>
      <div className="divide-y divide-line rounded-xl border border-line bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[15px]">
            <span className="text-muted">{label}</span>
            <span className="font-medium tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      <div className="pb-1.5 pt-4 text-[13px] font-medium text-muted">{t.workouts.history}</div>
      <div className="divide-y divide-line rounded-xl border border-line bg-surface">
        {sessions.slice(0, 20).map((s) => (
          <div key={s.workoutId} className="px-3.5 py-2.5">
            <div className="text-[13px] text-muted">{formatDate(s.date, 'dayMonth')}</div>
            <div className="text-[15px] tabular-nums">{s.sets.map((x) => formatSet(x, exercise.kind, units)).join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface WorkoutViewProps {
  initial: Workout
  workouts: readonly Workout[]
  exercises: readonly Exercise[]
  goals: readonly WeeklyGoal[]
  units: UnitLabels
  /** Открыть другую тренировку (после «Повторить») */
  onOpen: (workout: Workout) => void
  onDone: () => void
}

type Sheet = { kind: 'picker' } | { kind: 'info'; exercise: Exercise } | { kind: 'delete' }

/** Экран одной тренировки: упражнения, подходы, завершение */
export function WorkoutView({ initial, workouts, exercises, goals, units, onOpen, onDone }: WorkoutViewProps) {
  // Рабочая копия: поля ввода не ждут круга через базу, каждое изменение сразу сохраняется.
  const [workout, setWorkout] = useState(initial)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [message, setMessage] = useState<string>()
  const [, tick] = useState(0)
  const active = !workout.finishedAt

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => tick((n) => n + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [active])

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const recentIds = useMemo(() => recentExerciseIds(workouts), [workouts])

  const update = (next: Workout) => {
    setWorkout(next)
    setMessage(undefined)
    void saveWorkout(next)
  }
  const updateEntry = (id: string, change: (entry: WorkoutEntry) => WorkoutEntry) =>
    update({ ...workout, entries: workout.entries.map((e) => (e.id === id ? change(e) : e)) })

  const addExercise = (exercise: Exercise) => {
    const sets = initialSets(lastPerformance(workouts, exercise.id, workout.id))
    update({ ...workout, entries: [...workout.entries, { id: newId(), exerciseId: exercise.id, sets }] })
    setSheet(null)
  }

  const finish = async () => {
    if (!workout.entries.some((e) => e.sets.some((s) => s.done))) return setMessage(t.workouts.errNoSets)
    const result = await finishWorkout(workout)
    haptic()
    setWorkout(result.workout)
    const goal = goals.find((g) => g.id === workout.goalId)
    setMessage(!goal ? undefined : result.credited ? t.workouts.credited(goal.title) : t.workouts.notCredited(goal.title))
  }

  // Засчитать можно в цель, которая действует в день тренировки; уже выбранная остаётся в списке.
  const linkable = goals.filter((g) => g.id === workout.goalId || (!g.archived && isGoalActiveOn(g, workout.date)))
  const elapsed = minutesBetween(workout.startedAt, workout.finishedAt ?? new Date().toISOString())

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="rounded-xl bg-surface p-3">
          <input
            className={inputClass}
            value={workout.name}
            onChange={(e) => update({ ...workout, name: e.target.value })}
            placeholder={t.workouts.namePlaceholder}
            aria-label={t.workouts.namePlaceholder}
            maxLength={40}
            enterKeyHint="done"
          />
          <div className="px-1 pt-2 text-[13px] text-muted">
            {formatDate(workout.date, 'shortWeekdayDayMonth')} ·{' '}
            {active ? t.workouts.inProgress(formatDuration(elapsed)) : formatDuration(elapsed)}
          </div>
          {linkable.length > 0 && (
            <Field label={t.workouts.goal} hint={workout.goalId && active ? t.workouts.goalHint : undefined}>
              <select
                aria-label={t.workouts.goal}
                className={inputClass}
                value={workout.goalId ?? ''}
                disabled={!active}
                onChange={(e) => {
                  const { goalId: _g, ...rest } = workout
                  update(e.target.value ? { ...rest, goalId: e.target.value } : rest)
                }}
              >
                <option value="">{t.workouts.noGoal}</option>
                {linkable.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {workout.entries.length === 0 && (
          <div className="mt-2 rounded-xl bg-surface px-4 py-5 text-center text-[15px] text-muted">{t.workouts.noExercises}</div>
        )}

        {workout.entries.map((entry) => {
          const exercise = byId.get(entry.exerciseId)
          const kind = exercise?.kind ?? 'weight_reps'
          const last = lastPerformance(workouts, entry.exerciseId, workout.id)
          return (
            <div key={entry.id} className="mt-2 rounded-xl bg-surface px-3 pb-2 pt-1">
              <div className="flex items-center">
                <button
                  type="button"
                  disabled={!exercise}
                  onClick={() => exercise && setSheet({ kind: 'info', exercise })}
                  className="min-w-0 flex-1 py-2 text-left active:opacity-60"
                >
                  <span className="block truncate text-[16px] font-semibold text-accent">
                    {exercise?.name ?? t.workouts.unknownExercise}
                  </span>
                  {last.length > 0 && (
                    <span className="block truncate text-[13px] text-muted">
                      {t.workouts.lastTime(last.map((s) => formatSet(s, kind, units)).join(', '))}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={t.workouts.removeExercise(exercise?.name ?? '')}
                  onClick={() => update({ ...workout, entries: workout.entries.filter((e) => e.id !== entry.id) })}
                  className="flex h-11 w-10 shrink-0 scale-75 items-center justify-center text-muted/70 active:opacity-60"
                >
                  <CloseIcon />
                </button>
              </div>

              {entry.sets.map((set, i) => {
                const change = (next: WorkoutSet) =>
                  updateEntry(entry.id, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? next : s)) }))
                return (
                  <div key={i} className={`flex items-start gap-2 py-1 ${set.done ? 'opacity-60' : ''}`}>
                    <span className="flex h-10 w-5 shrink-0 items-center justify-center text-[14px] tabular-nums text-muted">
                      {i + 1}
                    </span>
                    <SetFields set={set} kind={kind} units={units} onChange={change} />
                    <StatusIcon
                      view={
                        set.done
                          ? { tone: 'green', glyph: 'check', label: t.workouts.setDone(i + 1) }
                          : { tone: 'gray', glyph: 'empty', label: t.workouts.setTodo(i + 1) }
                      }
                      onTap={() => {
                        if (!set.done && !isSetFilled(set, kind)) return setMessage(t.workouts.errEmptySet)
                        haptic()
                        change({ ...set, done: !set.done })
                      }}
                    />
                  </div>
                )
              })}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateEntry(entry.id, (e) => ({ ...e, sets: [...e.sets, nextSet(e.sets)] }))}
                  className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-accent/12 text-[14px] font-semibold text-accent active:opacity-60"
                >
                  <span className="flex scale-75">
                    <PlusIcon />
                  </span>
                  {t.workouts.addSet}
                </button>
                {entry.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateEntry(entry.id, (e) => ({ ...e, sets: e.sets.slice(0, -1) }))}
                    className="h-9 rounded-lg px-3 text-[14px] text-muted active:opacity-60"
                  >
                    {t.workouts.removeSet}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() => setSheet({ kind: 'picker' })}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface text-[16px] font-medium text-accent active:opacity-60"
        >
          <PlusIcon />
          {t.workouts.addExercise}
        </button>

        {!active && (
          <div className="flex flex-col gap-2 pt-4">
            <Button variant="plain" onClick={async () => onOpen(await startRepeat(workout))}>
              {t.workouts.repeat}
            </Button>
            <Button variant="danger" onClick={() => setSheet({ kind: 'delete' })}>
              {t.workouts.delete}
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 px-3 pt-2">
        {message && <p className="pb-2 text-center text-[14px] text-muted">{message}</p>}
        {active ? (
          <div className="flex gap-2">
            <Button variant="danger" className="!w-auto shrink-0" onClick={() => setSheet({ kind: 'delete' })}>
              {t.workouts.cancelWorkout}
            </Button>
            <Button onClick={() => void finish()}>{t.workouts.finish}</Button>
          </div>
        ) : (
          <Button onClick={onDone}>{t.common.done}</Button>
        )}
        <div className="pb-safe min-h-3" />
      </div>

      <BottomSheet
        open={sheet !== null}
        title={
          sheet?.kind === 'info'
            ? sheet.exercise.name
            : sheet?.kind === 'delete'
              ? t.workouts.deleteTitle
              : t.workouts.pickerTitle
        }
        onClose={() => setSheet(null)}
      >
        {sheet?.kind === 'picker' && <ExercisePicker exercises={exercises} recentIds={recentIds} onPick={addExercise} />}
        {sheet?.kind === 'info' && <ExerciseInfo exercise={sheet.exercise} workouts={workouts} units={units} />}
        {sheet?.kind === 'delete' && (
          <div>
            <p className="pb-4 pt-1 text-[15px]">{active ? t.workouts.cancelConfirm : t.workouts.deleteConfirm}</p>
            <div className="flex flex-col gap-2">
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteWorkout(workout.id)
                  onDone()
                }}
              >
                {t.workouts.delete}
              </Button>
              <Button variant="plain" onClick={() => setSheet(null)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
