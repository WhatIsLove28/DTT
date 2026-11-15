import { t } from '../i18n'
import type { TaskStatus } from './types'

export type StatusTone = 'gray' | 'yellow' | 'green' | 'red'
export type StatusGlyph = 'empty' | 'half' | 'check' | 'alert' | 'cross'

export interface StatusView {
  tone: StatusTone
  glyph: StatusGlyph
  label: string
}

/** Статус цели на неделю; вычисляется в домене (фаза 2) */
export type GoalStatus = 'achieved' | 'on_track' | 'unreachable'

/** Просрочка красит только незавершённые задачи: выполненная или пропущенная остаётся собой. */
export function taskStatusView(status: TaskStatus, overdue = false): StatusView {
  if (overdue && (status === 'todo' || status === 'in_progress')) {
    return { tone: 'red', glyph: 'alert', label: t.status.overdue }
  }
  switch (status) {
    case 'todo':
      return { tone: 'gray', glyph: 'empty', label: t.status.todo }
    case 'in_progress':
      return { tone: 'yellow', glyph: 'half', label: t.status.inProgress }
    case 'done':
      return { tone: 'green', glyph: 'check', label: t.status.done }
    case 'skipped':
      return { tone: 'gray', glyph: 'cross', label: t.status.skipped }
  }
}

export function goalStatusView(status: GoalStatus): StatusView {
  switch (status) {
    case 'achieved':
      return { tone: 'green', glyph: 'check', label: t.status.goalAchieved }
    case 'on_track':
      return { tone: 'yellow', glyph: 'half', label: t.status.goalOnTrack }
    case 'unreachable':
      return { tone: 'red', glyph: 'alert', label: t.status.goalUnreachable }
  }
}

/** Тап по иконке: todo → in_progress → done. Завершённые и пропущенные тапом не меняются. */
export function nextTaskStatus(status: TaskStatus): TaskStatus {
  if (status === 'todo') return 'in_progress'
  if (status === 'in_progress') return 'done'
  return status
}
