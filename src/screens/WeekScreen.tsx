import { useEffect, useMemo, useRef } from 'react'
import { Segmented } from '../components/fields'
import { haptic } from '../components/haptics'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../components/icons'
import { TaskCard } from '../components/TaskCard'
import { setTaskStatus } from '../db/actions'
import type { AppData } from '../db/hooks'
import { addDaysISO, weekDates, weekStartOf } from '../domain/dates'
import { generateForWeek } from '../domain/generate'
import { isOpen } from '../domain/overdue'
import { textOn } from '../domain/palette'
import { nextTaskStatus } from '../domain/statusView'
import type { ISODate, Task } from '../domain/types'
import { blockMinutes, groupByDisplayDate, layoutDay, MIN_BLOCK_MINUTES } from '../domain/weekView'
import { formatDate, formatDateRange, t } from '../i18n'
import { useUiStore, type WeekViewMode } from '../store/uiStore'

/** Задача для показа; planned — ещё не созданный экземпляр будущей недели */
type ViewTask = Task & { planned?: boolean }

/** Высота блока в недельной сетке: пропорциональна длительности, с разумными пределами */
function weekBlockHeight(minutes: number): number {
  return Math.round(Math.min(240, Math.max(38, 24 + minutes * 0.55)))
}

function blockLook(task: ViewTask, color: string, today: ISODate) {
  const skipped = task.status === 'skipped'
  const overdue = isOpen(task) && task.date < today && !task.planned
  return {
    style: skipped
      ? { backgroundColor: 'var(--line)', color: 'var(--muted)' }
      : { backgroundColor: color, color: textOn(color) },
    className: `${task.status === 'done' ? 'opacity-55' : ''} ${task.planned ? 'opacity-45' : ''} ${
      overdue ? 'ring-2 ring-inset ring-st-red' : ''
    }`,
    skipped,
  }
}

interface ViewProps {
  data: AppData
  today: ISODate
  onOpen: (task: ViewTask) => void
}

function WeekGrid({
  data,
  today,
  weekStart,
  byDate,
  onOpen,
  onPickDay,
}: ViewProps & {
  weekStart: ISODate
  byDate: Map<ISODate, ViewTask[]>
  onPickDay: (date: ISODate) => void
}) {
  const dates = weekDates(weekStart)
  return (
    <div className="pb-screen flex min-h-0 flex-1 flex-col px-1.5">
      <div className="grid shrink-0 grid-cols-7 gap-0.5">
        {dates.map((d) => {
          const isToday = d === today
          return (
            <button
              key={d}
              type="button"
              aria-label={formatDate(d, 'weekdayDayMonth')}
              onClick={() => onPickDay(d)}
              className="flex flex-col items-center pb-1.5 active:opacity-60"
            >
              <span className={`text-[11px] uppercase ${isToday ? 'text-accent' : 'text-muted'}`}>
                {formatDate(d, 'weekdayShort')}
              </span>
              <span
                className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-medium ${
                  isToday ? 'bg-accent text-white' : ''
                }`}
              >
                {Number(d.slice(8))}
              </span>
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid min-h-full grid-cols-7 gap-0.5">
          {dates.map((d) => (
            <div
              key={d}
              className={`flex min-w-0 flex-col gap-0.5 rounded-lg p-0.5 ${d === today ? 'bg-accent/10' : 'bg-surface/60'}`}
            >
              {(byDate.get(d) ?? []).map((task) => {
                const look = blockLook(task, data.colorOf(task.categoryId), today)
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpen(task)}
                    style={{ ...look.style, height: weekBlockHeight(blockMinutes(task)) }}
                    className={`shrink-0 overflow-hidden rounded-md px-1 py-0.5 text-left active:brightness-90 ${look.className}`}
                  >
                    {task.startTime && (
                      <span className="block text-[9px] font-semibold leading-tight tabular-nums opacity-90">
                        {task.startTime}
                      </span>
                    )}
                    <span
                      className={`block hyphens-auto break-words text-[10px] font-medium leading-[1.15] ${look.skipped ? 'line-through' : ''}`}
                    >
                      {task.status === 'done' ? '✓ ' : ''}
                      {task.title}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const HOUR_PX = 56
const PX_PER_MIN = HOUR_PX / 60

function DayView({ data, today, date, tasks, onOpen }: ViewProps & { date: ISODate; tasks: ViewTask[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  const untimed = tasks.filter((t) => !t.startTime)
  const blocks = useMemo(() => layoutDay(tasks), [tasks])
  const firstStart = blocks[0]?.start
  const seriesIds = useMemo(() => new Set(data.series.map((s) => s.id)), [data.series])

  // При открытии дня шкала прокручивается к первой задаче, а без задач — к семи утра.
  useEffect(() => {
    if (!scroller.current) return
    const startMin = Math.max(0, (firstStart ?? 8 * 60) - 60)
    scroller.current.scrollTop = startMin * PX_PER_MIN
  }, [date, firstStart])

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3">
      <div className="max-h-[40%] shrink-0 overflow-y-auto">
        {tasks.length === 0 && (
          <div className="mb-2 rounded-xl bg-surface px-4 py-4 text-center text-[15px] text-muted">
            {date < today ? t.week.noTasksPast : t.week.noTasks}
          </div>
        )}
        {untimed.length > 0 && (
          <div className="flex flex-col gap-2 pb-3">
            <div className="px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t.week.untimed}</div>
            {untimed.map((task) => (
              <div key={task.id} className={task.planned ? 'opacity-50' : ''}>
                <TaskCard
                  title={task.title}
                  categoryColor={data.colorOf(task.categoryId)}
                  status={task.status}
                  overdue={isOpen(task) && task.date < today}
                  startTime={task.startTime}
                  durationMin={blockMinutes(task)}
                  repeating={(!!task.seriesId && seriesIds.has(task.seriesId)) || task.source === 'goal'}
                  onStatusTap={
                    task.planned
                      ? undefined
                      : () => {
                          const next = nextTaskStatus(task.status)
                          if (next === task.status) return
                          haptic()
                          if (next === 'done') useUiStore.getState().openSheet({ kind: 'complete', task })
                          else void setTaskStatus(task, next)
                        }
                  }
                  onOpen={() => onOpen(task)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={scroller} className="pb-screen min-h-0 flex-1 overflow-y-auto pt-2">
        <div className="relative" style={{ height: 24 * HOUR_PX }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute inset-x-0 flex items-start" style={{ top: h * HOUR_PX }}>
              <span className="w-10 -translate-y-1/2 pr-1.5 text-right text-[11px] tabular-nums text-muted">
                {h > 0 ? `${String(h).padStart(2, '0')}:00` : ''}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
          ))}
          {date === today && (
            <div className="absolute inset-x-0 z-10 flex items-center" style={{ top: nowMin * PX_PER_MIN }}>
              <span className="ml-9 h-2 w-2 -translate-y-1/2 rounded-full bg-st-red" />
              <span className="h-px flex-1 -translate-y-1/2 bg-st-red" />
            </div>
          )}
          <div className="absolute inset-y-0 left-11 right-0">
            {blocks.map(({ task, start, minutes, col, cols }) => {
              const look = blockLook(task, data.colorOf(task.categoryId), today)
              const height = Math.max(minutes, MIN_BLOCK_MINUTES) * PX_PER_MIN
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpen(task)}
                  style={{
                    ...look.style,
                    top: start * PX_PER_MIN,
                    height: height - 2,
                    left: `${(col / cols) * 100}%`,
                    width: `calc(${100 / cols}% - 3px)`,
                  }}
                  className={`absolute overflow-hidden rounded-lg px-2 py-0.5 text-left active:brightness-90 ${look.className}`}
                >
                  <span
                    className={`block truncate text-[13px] font-semibold leading-tight ${look.skipped ? 'line-through' : ''}`}
                  >
                    {task.status === 'done' ? '✓ ' : ''}
                    {task.title}
                  </span>
                  {height >= 36 && <span className="block text-[11px] tabular-nums opacity-90">{task.startTime}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function WeekScreen({ data }: { data: AppData | undefined }) {
  const today = useUiStore((s) => s.today)
  const viewMode = useUiStore((s) => s.viewMode)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const selectedDate = useUiStore((s) => s.selectedDate)
  const setSelectedDate = useUiStore((s) => s.setSelectedDate)
  const openSheet = useUiStore((s) => s.openSheet)

  const weekStart = weekStartOf(selectedDate)

  const byDate = useMemo(() => {
    if (!data) return new Map<ISODate, ViewTask[]>()
    let tasks: ViewTask[] = data.tasks
    // Будущие недели ещё не сгенерированы — показываем их план, не записывая его в базу.
    if (weekStart > weekStartOf(today)) {
      const planned = generateForWeek(weekStart, {
        goals: data.goals,
        series: data.series,
        existingTaskIds: new Set(data.tasks.map((t) => t.id)),
      })
      tasks = [...tasks, ...planned.map((t) => ({ ...t, planned: true }))]
    }
    return groupByDisplayDate(tasks, weekDates(weekStart))
  }, [data, weekStart, today])

  const step = viewMode === 'week' ? 7 : 1
  const atToday = viewMode === 'week' ? weekStart === weekStartOf(today) : selectedDate === today
  const title =
    viewMode === 'week'
      ? formatDateRange(weekStart, addDaysISO(weekStart, 6))
      : formatDate(selectedDate, 'shortWeekdayDayMonth')
  const modes = [
    { value: 'week', label: t.week.modeWeek },
    { value: 'day', label: t.week.modeDay },
  ] as const
  // Плановый экземпляр будущей недели появится в базе сам, когда эта неделя наступит.
  const open = (task: ViewTask) => {
    if (!task.planned) openSheet({ kind: 'task', task })
  }

  const navButton = 'flex h-10 w-11 items-center justify-center text-accent active:opacity-60 disabled:text-muted/50'

  return (
    <div className="flex h-full flex-col">
      <header className="pt-safe shrink-0">
        <div className="flex items-center justify-between gap-2 pl-4 pr-1.5 pt-1">
          <h1 className="min-w-0 truncate text-[22px] font-bold first-letter:uppercase">{title}</h1>
          <div className="flex shrink-0 items-center gap-1">
            <Segmented<WeekViewMode> size="sm" options={modes} value={viewMode} onChange={setViewMode} />
            <button
              type="button"
              aria-label={t.week.pickDate}
              onClick={() => openSheet({ kind: 'calendar' })}
              className="flex h-11 w-11 items-center justify-center text-accent active:opacity-60"
            >
              <CalendarIcon />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-1.5 pb-1">
          <div className="flex items-center">
            <button
              type="button"
              aria-label={viewMode === 'week' ? t.week.prevWeek : t.week.prevDay}
              onClick={() => setSelectedDate(addDaysISO(selectedDate, -step))}
              className={navButton}
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              disabled={atToday}
              onClick={() => setSelectedDate(today)}
              className="h-10 px-2 text-[15px] font-medium text-accent active:opacity-60 disabled:text-muted/60"
            >
              {t.common.today}
            </button>
            <button
              type="button"
              aria-label={viewMode === 'week' ? t.week.nextWeek : t.week.nextDay}
              onClick={() => setSelectedDate(addDaysISO(selectedDate, step))}
              className={navButton}
            >
              <ChevronRightIcon />
            </button>
          </div>
          <button
            type="button"
            aria-label={t.week.add}
            onClick={() =>
              openSheet({
                kind: 'addChoice',
                date: viewMode === 'day' || weekStart !== weekStartOf(today) ? selectedDate : today,
                // Цель начнётся с открытой недели; прошедшую редактор заменит текущей.
                week: weekStart,
              })
            }
            className={navButton}
          >
            <PlusIcon />
          </button>
        </div>
      </header>

      {data &&
        (viewMode === 'week' ? (
          <WeekGrid
            data={data}
            today={today}
            weekStart={weekStart}
            byDate={byDate}
            onOpen={open}
            onPickDay={(d) => {
              setSelectedDate(d)
              setViewMode('day')
            }}
          />
        ) : (
          <DayView data={data} today={today} date={selectedDate} tasks={byDate.get(selectedDate) ?? []} onOpen={open} />
        ))}
    </div>
  )
}
