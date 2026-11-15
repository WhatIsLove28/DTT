import { formatGoalFact, formatGoalTarget } from '../domain/format'
import { goalStatusView, type GoalStatus } from '../domain/statusView'
import type { GoalTargetType } from '../domain/types'
import { t } from '../i18n'
import { StatusIcon } from './StatusIcon'

interface GoalRowProps {
  title: string
  categoryColor: string
  targetType: GoalTargetType
  targetValue: number
  factValue: number
  status: GoalStatus
  onOpen?: () => void
}

export function GoalRow({ title, categoryColor, targetType, targetValue, factValue, status, onOpen }: GoalRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen?.()
      }}
      className="flex items-center gap-3 py-1.5 pl-4 pr-1 active:opacity-70"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] leading-snug">{title}</div>
        <div className="text-[13px] text-muted">{t.home.goalTarget(formatGoalTarget(targetType, targetValue))}</div>
      </div>
      <div className="shrink-0 text-[16px] font-medium tabular-nums">
        {formatGoalFact(targetType, factValue, targetValue)}
      </div>
      <StatusIcon view={goalStatusView(status)} />
    </div>
  )
}
