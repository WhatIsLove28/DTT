import { useMemo } from 'react'
import { GoalRow } from '../components/GoalRow'
import { haptic } from '../components/haptics'
import { GearIcon, PlusIcon } from '../components/icons'
import { SwipeRow } from '../components/SwipeRow'
import { TaskCard } from '../components/TaskCard'
import { setTaskStatus } from '../db/actions'
import type { AppData } from '../db/hooks'
import { addDaysISO, weekStartOf } from '../domain/dates'
import { goalProgress, goalStatus } from '../domain/goalProgress'
import { isOpen } from '../domain/overdue'
import { isGoalActiveInWeek } from '../domain/recurrence'
import { nextTaskStatus } from '../domain/statusView'
import { getTodayList } from '../domain/today'
import type { Task } from '../domain/types'
import { formatDate, t } from '../i18n'
import { ModuleTiles } from '../modules/ModuleTiles'
import { useUiStore } from '../store/uiStore'

function SectionHeader({ title, addLabel, onAdd }: { title: string; addLabel: string; onAdd: () => void }) {
  return (
    <div className="flex items-end justify-between pl-1 pt-3">
      <h2 className="pb-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <button
        type="button"
        aria-label={addLabel}
        onClick={onAdd}
        className="flex h-10 w-11 items-center justify-center text-accent active:opacity-60"
      >
        <PlusIcon />
      </button>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return <div className="rounded-xl bg-surface px-4 py-5 text-center text-[15px] text-muted">{children}</div>
}

export function HomeScreen({ data }: { data: AppData | undefined }) {
  const openSettings = useUiStore((s) => s.openSettings)
  const openSheet = useUiStore((s) => s.openSheet)
  const today = useUiStore((s) => s.today)
  const week = weekStartOf(today)

  const goals = useMemo(() => {
    if (!data) return []
    return data.goals
      .filter((g) => !g.archived && isGoalActiveInWeek(g, week))
      .map((goal) => ({
        goal,
        progress: goalProgress(goal, week, data.tasks),
        status: goalStatus(goal, week, today, data.tasks),
      }))
  }, [data, week, today])

  // Цели, которые начнутся с одной из следующих недель: иначе до их старта к ним не добраться.
  const upcoming = useMemo(() => {
    if (!data) return []
    const nextWeek = addDaysISO(week, 7)
    return data.goals
      .filter((g) => !g.archived && g.startDate >= nextWeek)
      .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))
  }, [data, week])

  const items = useMemo(() => (data ? getTodayList(today, data) : []), [data, today])
  const seriesIds = useMemo(() => new Set(data?.series.map((s) => s.id)), [data])

  const tapStatus = (task: Task) => {
    const next = nextTaskStatus(task.status)
    if (next === task.status) return
    haptic()
    if (next === 'done') openSheet({ kind: 'complete', task })
    else void setTaskStatus(task, next)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="pt-safe shrink-0">
        <div className="flex items-center justify-between pl-4 pr-1.5 pt-1">
          <h1 className="text-[22px] font-bold first-letter:uppercase">
            {formatDate(today, 'weekdayDayMonth')}
          </h1>
          <button
            type="button"
            aria-label={t.home.settings}
            onClick={openSettings}
            className="flex h-11 w-11 items-center justify-center text-muted active:opacity-60"
          >
            <GearIcon />
          </button>
        </div>
      </header>

      {data && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <SectionHeader title={t.home.goals} addLabel={t.home.addGoal} onAdd={() => openSheet({ kind: 'goal' })} />
          {goals.length === 0 ? (
            <Empty>{t.home.noGoals}</Empty>
          ) : (
            <div className="divide-y divide-line rounded-xl bg-surface">
              {goals.map(({ goal, progress, status }) => (
                <GoalRow
                  key={goal.id}
                  title={goal.title}
                  categoryColor={data.colorOf(goal.categoryId)}
                  targetType={goal.targetType}
                  targetValue={goal.targetValue}
                  factValue={progress.value}
                  status={status}
                  onOpen={() => openSheet({ kind: 'goal', goal })}
                />
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <>
              <h2 className="px-1 pb-1.5 pt-4 text-[13px] font-semibold uppercase tracking-wide text-muted">
                {t.home.plannedGoals}
              </h2>
              <div className="divide-y divide-line rounded-xl bg-surface">
                {upcoming.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => openSheet({ kind: 'goal', goal })}
                    className="flex min-h-12 w-full items-center gap-3 px-4 py-1.5 text-left active:opacity-70"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: data.colorOf(goal.categoryId) }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[16px]">{goal.title}</span>
                    <span className="shrink-0 text-[14px] text-muted">
                      {t.home.startsOn(formatDate(goal.startDate, 'dayMonth'))}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          <SectionHeader
            title={t.common.today}
            addLabel={t.home.addTask}
            onAdd={() => openSheet({ kind: 'task', date: today })}
          />
          {items.length === 0 ? (
            <Empty>{t.home.noTasks}</Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map(({ task, overdue }) => (
                <SwipeRow
                  key={task.id}
                  onDone={isOpen(task) ? () => openSheet({ kind: 'complete', task }) : undefined}
                  onSkip={isOpen(task) ? () => void setTaskStatus(task, 'skipped') : undefined}
                  onDelete={() => openSheet({ kind: 'deleteTask', task })}
                >
                  <TaskCard
                    title={task.title}
                    categoryColor={data.colorOf(task.categoryId)}
                    status={task.status}
                    overdue={overdue}
                    overdueSince={overdue ? t.task.since(formatDate(task.date, 'dayShortMonth')) : undefined}
                    startTime={task.startTime}
                    durationMin={task.actualDurationMin ?? task.plannedDurationMin}
                    repeating={
                      (!!task.seriesId && seriesIds.has(task.seriesId)) || task.source === 'goal'
                    }
                    onStatusTap={() => tapStatus(task)}
                    onOpen={() => openSheet({ kind: 'task', task })}
                  />
                </SwipeRow>
              ))}
            </div>
          )}

          <ModuleTiles />
        </div>
      )}
    </div>
  )
}
