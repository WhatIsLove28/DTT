import { useMemo, useState } from 'react'
import { Button, Chip, Field, inputClass } from '../../components/fields'
import { PlusIcon } from '../../components/icons'
import { t } from '../../i18n'
import { MUSCLE_GROUPS } from './catalog'
import { searchExercises } from './domain'
import { createExercise } from './store'
import type { Exercise, ExerciseKind, MuscleGroup } from './types'

const KINDS: readonly ExerciseKind[] = ['weight_reps', 'reps', 'time', 'distance']

interface ExercisePickerProps {
  exercises: readonly Exercise[]
  recentIds: readonly string[]
  onPick: (exercise: Exercise) => void
}

/** Выбор упражнения: поиск по названию, строка групп мышц, создание своего */
export function ExercisePicker({ exercises, recentIds, onPick }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup>()
  const [creating, setCreating] = useState(false)
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('chest')
  const [kind, setKind] = useState<ExerciseKind>('weight_reps')
  const [error, setError] = useState<string>()

  const found = useMemo(() => searchExercises(exercises, query, muscle, recentIds), [exercises, query, muscle, recentIds])
  const name = query.trim()

  const chipRow = 'no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4'

  if (creating) {
    const create = async () => {
      if (!name) return setError(t.workouts.errExerciseName)
      if (exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) return setError(t.workouts.errExerciseDuplicate)
      onPick({ ...(await createExercise({ name, muscle: newMuscle, kind })), custom: true })
    }
    return (
      <div>
        <Field label={t.common.name}>
          <input
            className={inputClass}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setError(undefined)
            }}
            maxLength={50}
            enterKeyHint="done"
          />
        </Field>
        <Field label={t.workouts.muscleLabel}>
          <div className={chipRow}>
            {MUSCLE_GROUPS.map((m) => (
              <Chip key={m} selected={m === newMuscle} onClick={() => setNewMuscle(m)}>
                {t.workouts.muscles[m]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label={t.workouts.kindLabel}>
          <div className={chipRow}>
            {KINDS.map((k) => (
              <Chip key={k} selected={k === kind} onClick={() => setKind(k)}>
                {t.workouts.kinds[k]}
              </Chip>
            ))}
          </div>
        </Field>
        {error && <p className="pt-3 text-[14px] text-st-red">{error}</p>}
        <div className="flex flex-col gap-2 pt-5">
          <Button onClick={() => void create()}>{t.workouts.createExercise}</Button>
          <Button variant="plain" onClick={() => setCreating(false)}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <input
        type="search"
        className={inputClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.workouts.search}
        aria-label={t.workouts.search}
        enterKeyHint="search"
      />
      <div className={`${chipRow} py-2.5`}>
        <Chip selected={!muscle} onClick={() => setMuscle(undefined)}>
          {t.workouts.allMuscles}
        </Chip>
        {MUSCLE_GROUPS.map((m) => (
          <Chip key={m} selected={m === muscle} onClick={() => setMuscle(m)}>
            {t.workouts.muscles[m]}
          </Chip>
        ))}
      </div>

      {/* Высота списка постоянная: окно не прыгает, пока меняется число найденных упражнений */}
      <div className="h-[46dvh] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface">
        <div className="divide-y divide-line">
          {found.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onPick(e)}
              className="flex min-h-12 w-full items-center gap-2 px-3.5 py-1.5 text-left active:opacity-60"
            >
              <span className="min-w-0 flex-1 text-[16px] leading-snug">{e.name}</span>
              <span className="shrink-0 text-[13px] text-muted">
                {e.custom ? `${t.workouts.customBadge} · ` : ''}
                {t.workouts.muscles[e.muscle]}
              </span>
            </button>
          ))}
          {found.length === 0 && <p className="px-4 py-5 text-center text-[15px] text-muted">{t.workouts.notFound}</p>}
          <button
            type="button"
            onClick={() => {
              if (muscle) setNewMuscle(muscle)
              setCreating(true)
            }}
            className="flex min-h-12 w-full items-center gap-2 px-2.5 text-left text-[16px] text-accent active:opacity-60"
          >
            <PlusIcon />
            <span className="min-w-0 truncate">{name ? t.workouts.createCustom(name) : t.workouts.newExercise}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
