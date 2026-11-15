import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { BottomSheet } from '../components/BottomSheet'
import { Button, DurationInput } from '../components/fields'
import { haptic } from '../components/haptics'
import { completeTask, deleteTask } from '../db/actions'
import type { AppData } from '../db/hooks'
import { fromISODate, toISODate } from '../domain/dates'
import type { Task } from '../domain/types'
import { dateLocale, t } from '../i18n'
import { useUiStore, type Sheet } from '../store/uiStore'
import { GoalEditor } from './GoalEditor'
import { TaskEditor } from './TaskEditor'

function sheetTitle(sheet: Sheet): string {
  switch (sheet.kind) {
    case 'task':
      return sheet.task ? t.sheets.task : t.sheets.newTask
    case 'goal':
      return sheet.goal ? t.sheets.goal : t.sheets.newGoal
    case 'complete':
      return t.sheets.complete
    case 'deleteTask':
      return t.sheets.deleteTask
    case 'calendar':
      return t.sheets.calendar
    case 'addChoice':
      return t.sheets.addChoice
  }
}

function CompleteForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const [minutes, setMinutes] = useState(task.actualDurationMin ?? task.plannedDurationMin)
  const [busy, setBusy] = useState(false)
  return (
    <div>
      <p className="truncate pb-3 pt-1 text-[15px] text-muted">{task.title}</p>
      <DurationInput value={minutes} onChange={setMinutes} />
      <div className="pt-5">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await completeTask(task, minutes)
            haptic()
            onClose()
          }}
        >
          {t.common.done}
        </Button>
      </div>
    </div>
  )
}

function DeleteForm({ task, data, onClose }: { task: Task; data: AppData; onClose: () => void }) {
  const isSeries = !!task.seriesId && data.series.some((s) => s.id === task.seriesId)
  const run = async (scope: 'one' | 'following') => {
    await deleteTask(task, scope)
    onClose()
  }
  return (
    <div>
      <p className="pb-4 pt-1 text-[15px]">
        {t.sheets.deleteText(task.title, isSeries ? 'series' : task.source === 'goal' ? 'goal' : 'manual')}
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="danger" onClick={() => void run('one')}>
          {isSeries ? t.sheets.onlyThis : t.common.delete}
        </Button>
        {isSeries && (
          <Button variant="danger" onClick={() => void run('following')}>
            {t.sheets.thisAndFollowing}
          </Button>
        )}
        <Button variant="plain" onClick={onClose}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  )
}

function CalendarForm({ onClose }: { onClose: () => void }) {
  const selectedDate = useUiStore((s) => s.selectedDate)
  const setSelectedDate = useUiStore((s) => s.setSelectedDate)
  const today = useUiStore((s) => s.today)
  const selected = fromISODate(selectedDate)
  return (
    <div className="flex flex-col items-center">
      <DayPicker
        mode="single"
        required
        locale={dateLocale}
        weekStartsOn={1}
        selected={selected}
        defaultMonth={selected}
        today={fromISODate(today)}
        onSelect={(d) => {
          if (d) setSelectedDate(toISODate(d))
          onClose()
        }}
      />
    </div>
  )
}

function AddChoice({ date, week }: { date: string; week: string }) {
  const openSheet = useUiStore((s) => s.openSheet)
  const option = 'flex w-full flex-col rounded-xl border border-line bg-surface px-4 py-3 text-left active:opacity-70'
  return (
    <div className="flex flex-col gap-2 pt-1">
      <button type="button" className={option} onClick={() => openSheet({ kind: 'task', date })}>
        <span className="text-[17px] font-semibold">{t.sheets.choiceTask}</span>
        <span className="text-[14px] text-muted">{t.sheets.choiceTaskHint}</span>
      </button>
      <button type="button" className={option} onClick={() => openSheet({ kind: 'goal', week })}>
        <span className="text-[17px] font-semibold">{t.sheets.choiceGoal}</span>
        <span className="text-[14px] text-muted">{t.sheets.choiceGoalHint}</span>
      </button>
    </div>
  )
}

/** Все нижние окна приложения; какое открыто — хранится в uiStore */
export function Sheets({ data }: { data: AppData }) {
  const sheet = useUiStore((s) => s.sheet)
  const closeSheet = useUiStore((s) => s.closeSheet)
  const today = useUiStore((s) => s.today)
  const selectedDate = useUiStore((s) => s.selectedDate)
  if (!sheet) return null

  return (
    <BottomSheet open title={sheetTitle(sheet)} onClose={closeSheet}>
      {sheet.kind === 'task' && (
        <TaskEditor
          key={sheet.task?.id ?? 'new'}
          task={sheet.task}
          date={sheet.date ?? selectedDate}
          data={data}
          today={today}
          onClose={closeSheet}
        />
      )}
      {sheet.kind === 'goal' && (
        <GoalEditor
          key={sheet.goal?.id ?? 'new'}
          goal={sheet.goal}
          week={sheet.week}
          data={data}
          today={today}
          onClose={closeSheet}
        />
      )}
      {sheet.kind === 'complete' && <CompleteForm key={sheet.task.id} task={sheet.task} onClose={closeSheet} />}
      {sheet.kind === 'deleteTask' && <DeleteForm task={sheet.task} data={data} onClose={closeSheet} />}
      {sheet.kind === 'calendar' && <CalendarForm onClose={closeSheet} />}
      {sheet.kind === 'addChoice' && <AddChoice date={sheet.date} week={sheet.week} />}
    </BottomSheet>
  )
}
