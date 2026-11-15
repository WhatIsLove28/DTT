import { describe, expect, it } from 'vitest'
import { goalStatusView, nextTaskStatus, taskStatusView } from './statusView'

describe('taskStatusView', () => {
  it('цвета по статусам', () => {
    expect(taskStatusView('todo').tone).toBe('gray')
    expect(taskStatusView('in_progress').tone).toBe('yellow')
    expect(taskStatusView('done').tone).toBe('green')
    expect(taskStatusView('skipped')).toMatchObject({ tone: 'gray', glyph: 'cross' })
  })

  it('просрочка красит незавершённые задачи', () => {
    expect(taskStatusView('todo', true)).toMatchObject({ tone: 'red', glyph: 'alert' })
    expect(taskStatusView('in_progress', true).tone).toBe('red')
  })

  it('просрочка не меняет выполненные и пропущенные', () => {
    expect(taskStatusView('done', true).tone).toBe('green')
    expect(taskStatusView('skipped', true).glyph).toBe('cross')
  })
})

describe('goalStatusView', () => {
  it('цвета по статусам цели', () => {
    expect(goalStatusView('achieved').tone).toBe('green')
    expect(goalStatusView('on_track').tone).toBe('yellow')
    expect(goalStatusView('unreachable').tone).toBe('red')
  })
})

describe('nextTaskStatus', () => {
  it('todo → in_progress → done', () => {
    expect(nextTaskStatus('todo')).toBe('in_progress')
    expect(nextTaskStatus('in_progress')).toBe('done')
  })

  it('done и skipped тапом не меняются', () => {
    expect(nextTaskStatus('done')).toBe('done')
    expect(nextTaskStatus('skipped')).toBe('skipped')
  })
})
