import { formatDuration } from '../domain/format'
import { taskStatusView } from '../domain/statusView'
import type { TaskStatus, TimeOfDay } from '../domain/types'
import { t } from '../i18n'
import { RepeatIcon } from './icons'
import { StatusIcon } from './StatusIcon'

interface TaskCardProps {
  title: string
  categoryColor: string
  status: TaskStatus
  overdue?: boolean
  /** Подпись к красной метке, например «с 12 нояб.» */
  overdueSince?: string
  startTime?: TimeOfDay
  durationMin: number
  repeating?: boolean
  onStatusTap?: () => void
  onOpen?: () => void
}

export function TaskCard({
  title,
  categoryColor,
  status,
  overdue = false,
  overdueSince,
  startTime,
  durationMin,
  repeating = false,
  onStatusTap,
  onOpen,
}: TaskCardProps) {
  const view = taskStatusView(status, overdue)
  const isOverdue = view.tone === 'red'
  const skipped = status === 'skipped'
  const meta = [startTime, formatDuration(durationMin)].filter(Boolean).join(' · ')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen?.()
      }}
      className="flex items-stretch overflow-hidden rounded-xl bg-surface active:opacity-80"
    >
      <span className="w-1.5 shrink-0" style={{ backgroundColor: categoryColor }} />
      <StatusIcon view={view} onTap={onStatusTap} />
      <div className="min-w-0 flex-1 self-center py-2.5 pr-3">
        <div
          className={`truncate text-[16px] leading-snug ${
            skipped ? 'text-muted line-through' : status === 'done' ? 'text-muted' : 'text-fg'
          }`}
        >
          {title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
          <span>{meta}</span>
          {repeating && (
            <span className="flex" role="img" aria-label={t.task.repeats}>
              <RepeatIcon />
            </span>
          )}
          {isOverdue && (
            <span className="truncate rounded-full bg-st-red/15 px-2 py-px text-[12px] font-medium text-st-red">
              {t.task.overdueBadge}
              {overdueSince ? ` ${overdueSince}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
