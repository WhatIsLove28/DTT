import { useState } from 'react'
import { Button, DurationInput, Field, inputClass, TimeInput } from '../components/fields'
import { CategoryPicker, RecurrencePicker } from '../components/pickers'
import { createTask, setTaskStatus, updateTask, type TaskInput } from '../db/actions'
import type { AppData } from '../db/hooks'
import { formatRecurrence, recurrenceError } from '../domain/format'
import { isOpen } from '../domain/overdue'
import { taskStatusView } from '../domain/statusView'
import type { ISODate, Recurrence, Task } from '../domain/types'
import { formatDate, t } from '../i18n'
import { useUiStore } from '../store/uiStore'

interface TaskEditorProps {
  task?: Task
  /** Дата новой задачи */
  date: ISODate
  data: AppData
  today: ISODate
  onClose: () => void
}

export function TaskEditor({ task, date: initialDate, data, today, onClose }: TaskEditorProps) {
  const openSheet = useUiStore((s) => s.openSheet)
  const series = task?.seriesId ? data.series.find((s) => s.id === task.seriesId) : undefined
  const seriesActive = !!series && (!series.endDate || series.endDate > today)
  const fromGoal = task?.source === 'goal'
  const goal = task?.goalId ? data.goals.find((g) => g.id === task.goalId) : undefined

  const [title, setTitle] = useState(task?.title ?? '')
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? data.categories[0]?.id ?? '')
  const [date, setDate] = useState(task?.date ?? initialDate)
  const [duration, setDuration] = useState(task?.plannedDurationMin ?? 30)
  const [startTime, setStartTime] = useState(task?.startTime)
  const [goalId, setGoalId] = useState(task?.goalId ?? '')
  const [recurrence, setRecurrence] = useState<Recurrence>(seriesActive ? series.recurrence : { type: 'none' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  // Привязать можно к действующей цели; уже выбранная остаётся в списке, даже если она в архиве.
  const linkable = data.goals.filter((g) => g.id === goalId || (!g.archived && (!g.endDate || g.endDate >= today)))

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
      ? t.taskEditor.errTitle
      : !categoryId
        ? t.common.chooseCategory
        : !date
          ? t.taskEditor.errDate
          : recurrenceError(recurrence)
    if (problem) return setError(problem)
    const input: TaskInput = {
      title: title.trim(),
      categoryId,
      date,
      plannedDurationMin: duration,
      startTime,
      goalId: goalId || undefined,
      recurrence,
    }
    void run(() => (task ? updateTask(task, input, today) : createTask(input, today)))
  }

  const overdue = !!task && isOpen(task) && task.date < today

  return (
    <div>
      {task && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[14px] text-muted">
          <span className="first-letter:uppercase">{formatDate(task.date, 'shortWeekdayDayMonth')}</span>
          <span>· {taskStatusView(task.status, overdue).label.toLowerCase()}</span>
          {fromGoal && goal && <span>· {t.taskEditor.fromGoal(goal.title)}</span>}
          {series && (
            <span>
              · {t.taskEditor.repeat(seriesActive ? formatRecurrence(series.recurrence) : t.taskEditor.repeatOff)}
            </span>
          )}
        </div>
      )}

      <Field label={t.common.name}>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.taskEditor.titlePlaceholder}
          maxLength={80}
          enterKeyHint="done"
        />
      </Field>

      <Field label={t.common.category}>
        <CategoryPicker categories={data.categories} value={categoryId} onChange={setCategoryId} />
      </Field>

      {(!task || task.source === 'manual') && (
        <Field label={recurrence.type === 'none' ? t.taskEditor.date : t.taskEditor.startingFrom}>
          <input
            type="date"
            aria-label={t.taskEditor.date}
            className={`${inputClass} max-w-44`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      )}

      <Field label={t.taskEditor.plannedDuration}>
        <DurationInput value={duration} onChange={setDuration} />
      </Field>

      <Field label={t.taskEditor.startTime}>
        <TimeInput value={startTime} onChange={setStartTime} />
      </Field>

      {!fromGoal && (
        <Field label={t.taskEditor.goalLink} hint={goalId ? t.taskEditor.goalLinkHint : undefined}>
          <select
            aria-label={t.taskEditor.goalLink}
            className={inputClass}
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
          >
            <option value="">{t.taskEditor.noLink}</option>
            {linkable.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      {!fromGoal && (
        <Field
          label={t.taskEditor.autoRepeat}
          hint={
            seriesActive && recurrence.type === 'none'
              ? t.taskEditor.hintRepeatEnds
              : seriesActive
                ? t.taskEditor.hintSeriesChange
                : recurrence.type === 'times_per_week'
                  ? t.recurrence.hintFlexible
                  : undefined
          }
        >
          <RecurrencePicker value={recurrence} onChange={setRecurrence} noneLabel={t.taskEditor.noRepeat} />
        </Field>
      )}

      {error && <p className="pt-3 text-[14px] text-st-red">{error}</p>}

      <div className="flex flex-col gap-2 pt-5">
        <Button onClick={save} disabled={busy}>
          {task ? t.common.save : t.taskEditor.add}
        </Button>

        {task && isOpen(task) && (
          <div className="flex gap-2">
            <Button variant="plain" onClick={() => openSheet({ kind: 'complete', task })} disabled={busy}>
              {t.task.markDone}
            </Button>
            <Button variant="plain" onClick={() => void run(() => setTaskStatus(task, 'skipped'))} disabled={busy}>
              {t.task.skip}
            </Button>
          </div>
        )}
        {task && !isOpen(task) && (
          <Button variant="plain" onClick={() => void run(() => setTaskStatus(task, 'todo'))} disabled={busy}>
            {t.taskEditor.reopen}
          </Button>
        )}
        {task && (
          <Button variant="danger" onClick={() => openSheet({ kind: 'deleteTask', task })} disabled={busy}>
            {t.common.delete}
          </Button>
        )}
      </div>
    </div>
  )
}
