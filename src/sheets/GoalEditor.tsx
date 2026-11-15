import { useState } from 'react'
import { Button, Field, DurationInput, inputClass, NumberInput, Segmented, TimeInput, Toggle } from '../components/fields'
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import { CategoryPicker, RecurrencePicker } from '../components/pickers'
import { archiveGoal, createGoal, deleteGoal, updateGoal, type GoalInput } from '../db/actions'
import type { AppData } from '../db/hooks'
import { addDaysISO, weekStartOf } from '../domain/dates'
import { naturalWeeklyCount, recurrenceError } from '../domain/format'
import type { GoalTargetType, Recurrence, WeeklyGoal } from '../domain/types'
import { formatDateRange, t } from '../i18n'

interface GoalEditorProps {
  goal?: WeeklyGoal
  /** Неделя старта новой цели (понедельник); раньше текущей не бывает */
  week?: string
  data: AppData
  today: string
  onClose: () => void
}

const MAX_WEEKS_AHEAD = 26

function weekLabel(week: string, currentWeek: string): string {
  const range = formatDateRange(week, addDaysISO(week, 6))
  if (week === currentWeek) return t.goalEditor.thisWeek(range)
  if (week === addDaysISO(currentWeek, 7)) return t.goalEditor.nextWeek(range)
  return range
}

export function GoalEditor({ goal, week, data, today, onClose }: GoalEditorProps) {
  const currentWeek = weekStartOf(today)
  const [startWeek, setStartWeek] = useState(week && week > currentWeek ? weekStartOf(week) : currentWeek)
  const [title, setTitle] = useState(goal?.title ?? '')
  const [categoryId, setCategoryId] = useState(goal?.categoryId ?? data.categories[0]?.id ?? '')
  const [schedule, setSchedule] = useState<Recurrence>(goal?.schedule ?? { type: 'weekdays', weekdays: [1, 3, 5] })
  const [targetType, setTargetType] = useState<GoalTargetType>(goal?.targetType ?? 'count')
  const [targetValue, setTargetValue] = useState(goal?.targetValue ?? 3)
  // Пока норму не трогали руками, она следует за расписанием.
  const [targetTouched, setTargetTouched] = useState(!!goal)
  const [duration, setDuration] = useState(goal?.defaultDurationMin ?? 30)
  const [startTime, setStartTime] = useState(goal?.defaultStartTime)
  const [repeatWeekly, setRepeatWeekly] = useState(goal?.repeatWeekly ?? true)
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const targetTypes = [
    { value: 'count', label: t.goalEditor.targetCount },
    { value: 'percent', label: t.goalEditor.targetPercent },
  ] as const

  const changeSchedule = (next: Recurrence) => {
    setSchedule(next)
    if (!targetTouched && targetType === 'count') setTargetValue(naturalWeeklyCount(next))
  }

  const changeTargetType = (next: GoalTargetType) => {
    setTargetType(next)
    setTargetValue(next === 'percent' ? 80 : naturalWeeklyCount(schedule))
    setTargetTouched(false)
  }

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.saveFailed)
      setBusy(false)
    }
  }

  const save = () => {
    const problem = !title.trim()
      ? t.goalEditor.errTitle
      : !categoryId
        ? t.common.chooseCategory
        : recurrenceError(schedule)
    if (problem) return setError(problem)
    const input: GoalInput = {
      title: title.trim(),
      categoryId,
      schedule,
      targetType,
      targetValue,
      defaultDurationMin: duration,
      defaultStartTime: startTime,
      repeatWeekly,
    }
    void run(() => (goal ? updateGoal(goal, input, today) : createGoal(input, today, startWeek)))
  }

  return (
    <div>
      <Field label={t.common.name}>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.goalEditor.titlePlaceholder}
          maxLength={80}
          enterKeyHint="done"
        />
      </Field>

      <Field label={t.common.category}>
        <CategoryPicker categories={data.categories} value={categoryId} onChange={setCategoryId} />
      </Field>

      {!goal && (
        <Field
          label={t.goalEditor.startWeek}
          hint={startWeek > currentWeek ? t.goalEditor.startWeekHint : undefined}
        >
          <div className="flex h-11 items-center rounded-xl border border-line bg-surface">
            <button
              type="button"
              aria-label={t.goalEditor.earlier}
              disabled={startWeek <= currentWeek}
              onClick={() => setStartWeek(addDaysISO(startWeek, -7))}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-accent active:opacity-60 disabled:text-muted/40"
            >
              <ChevronLeftIcon />
            </button>
            <span className="min-w-0 flex-1 truncate text-center text-[16px]">{weekLabel(startWeek, currentWeek)}</span>
            <button
              type="button"
              aria-label={t.goalEditor.later}
              disabled={startWeek >= addDaysISO(currentWeek, 7 * MAX_WEEKS_AHEAD)}
              onClick={() => setStartWeek(addDaysISO(startWeek, 7))}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-accent active:opacity-60 disabled:text-muted/40"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </Field>
      )}

      <Field
        label={t.goalEditor.schedule}
        hint={
          schedule.type === 'times_per_week'
            ? t.recurrence.hintFlexible
            : schedule.type === 'none'
              ? t.goalEditor.hintNone
              : schedule.type === 'every_n_days' && !goal
                ? startWeek > currentWeek
                  ? t.goalEditor.hintFromMonday
                  : t.goalEditor.hintFromToday
                : undefined
        }
      >
        <RecurrencePicker value={schedule} onChange={changeSchedule} noneLabel={t.goalEditor.noSchedule} />
      </Field>

      <Field label={t.goalEditor.weeklyTarget}>
        <Segmented options={targetTypes} value={targetType} onChange={changeTargetType} />
        <div className="pt-2">
          <NumberInput
            label={t.goalEditor.norm}
            value={targetValue}
            onChange={(v) => {
              setTargetValue(v)
              setTargetTouched(true)
            }}
            min={1}
            max={targetType === 'percent' ? 100 : 99}
            suffix={targetType === 'percent' ? t.goalEditor.suffixPercent : t.goalEditor.suffixCount}
          />
        </div>
      </Field>

      <Field label={t.goalEditor.defaultDuration}>
        <DurationInput value={duration} onChange={setDuration} />
      </Field>

      <Field label={t.goalEditor.defaultStartTime}>
        <TimeInput value={startTime} onChange={setStartTime} />
      </Field>

      <Field
        label={t.goalEditor.repeat}
        hint={
          goal?.repeatWeekly && !repeatWeekly
            ? t.goalEditor.hintEndsToday
            : !repeatWeekly
              ? startWeek > currentWeek && !goal
                ? t.goalEditor.hintOnlySelectedWeek
                : t.goalEditor.hintOnlyThisWeek
              : undefined
        }
      >
        <Toggle checked={repeatWeekly} onChange={setRepeatWeekly} label={t.goalEditor.repeatWeekly} />
      </Field>

      {error && <p className="pt-3 text-[14px] text-st-red">{error}</p>}

      <div className="flex flex-col gap-2 pt-5">
        <Button onClick={save} disabled={busy}>
          {goal ? t.common.save : t.goalEditor.create}
        </Button>

        {goal && confirm === null && (
          <div className="flex gap-2">
            <Button variant="plain" onClick={() => setConfirm('archive')} disabled={busy}>
              {t.goalEditor.archive}
            </Button>
            <Button variant="danger" onClick={() => setConfirm('delete')} disabled={busy}>
              {t.common.delete}
            </Button>
          </div>
        )}

        {goal && confirm === 'archive' && (
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="pb-3 text-[14px]">
              {t.goalEditor.archiveConfirm}
            </p>
            <div className="flex gap-2">
              <Button variant="plain" onClick={() => setConfirm(null)}>
                {t.common.cancel}
              </Button>
              <Button onClick={() => void run(() => archiveGoal(goal, today))} disabled={busy}>
                {t.goalEditor.archive}
              </Button>
            </div>
          </div>
        )}

        {goal && confirm === 'delete' && (
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="pb-3 text-[14px]">
              {t.goalEditor.deleteConfirm}
            </p>
            <div className="flex gap-2">
              <Button variant="plain" onClick={() => setConfirm(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" onClick={() => void run(() => deleteGoal(goal.id))} disabled={busy}>
                {t.goalEditor.deleteForever}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
