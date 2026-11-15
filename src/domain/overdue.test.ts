import { describe, expect, it } from 'vitest'
import { applyOverdueRules, isOverdue } from './overdue'
import { makeDone, makeTask } from './testFactories'

const TODAY = '2026-11-18' // среда, неделя с 16 ноября

describe('isOverdue', () => {
  it('просрочена незавершённая задача с прошедшей датой', () => {
    expect(isOverdue(makeTask({ date: '2026-11-17' }), TODAY)).toBe(true)
    expect(isOverdue(makeTask({ date: '2026-11-17', status: 'in_progress' }), TODAY)).toBe(true)
    expect(isOverdue(makeTask({ date: TODAY }), TODAY)).toBe(false)
    expect(isOverdue(makeDone({ date: '2026-11-17' }), TODAY)).toBe(false)
    expect(isOverdue(makeTask({ date: '2026-11-17', status: 'skipped' }), TODAY)).toBe(false)
  })
})

describe('applyOverdueRules', () => {
  it('ручные разовые задачи не пропускаются никогда', () => {
    const tasks = [makeTask({ id: 'm1', date: '2026-10-01' }), makeTask({ id: 'm2', date: '2025-12-31' })]
    expect(applyOverdueRules(TODAY, tasks)).toEqual([])
  })

  it('ручная задача, привязанная к цели, тоже переносится без ограничений', () => {
    const tasks = [makeTask({ id: 'm1', date: '2026-11-02', goalId: 'g1' })]
    expect(applyOverdueRules(TODAY, tasks)).toEqual([])
  })

  it('задача цели внутри текущей недели остаётся просроченной, но не пропускается', () => {
    const tasks = [makeTask({ id: 'a', source: 'goal', goalId: 'g1', date: '2026-11-16' })]
    expect(applyOverdueRules(TODAY, tasks)).toEqual([])
  })

  it('задача цели из прошлой недели получает skipped', () => {
    const tasks = [
      makeTask({ id: 'a', source: 'goal', goalId: 'g1', date: '2026-11-13' }),
      makeTask({ id: 'b', source: 'goal', goalId: 'g1', date: '2026-11-15', status: 'in_progress' }),
    ]
    expect(applyOverdueRules(TODAY, tasks)).toEqual(['a', 'b'])
  })

  it('граница недели: воскресная задача пропускается в понедельник, но не в воскресенье', () => {
    const tasks = [makeTask({ id: 'a', source: 'goal', goalId: 'g1', date: '2026-11-13' })]
    expect(applyOverdueRules('2026-11-15', tasks)).toEqual([])
    expect(applyOverdueRules('2026-11-16', tasks)).toEqual(['a'])
  })

  it('граница года: неделя 28 декабря — 3 января', () => {
    const tasks = [makeTask({ id: 'a', source: 'goal', goalId: 'g1', date: '2026-12-31' })]
    expect(applyOverdueRules('2027-01-03', tasks)).toEqual([])
    expect(applyOverdueRules('2027-01-04', tasks)).toEqual(['a'])
  })

  it('экземпляр серии пропускается, когда появился следующий', () => {
    const s = { source: 'series', seriesId: 's1' } as const
    const tasks = [
      makeTask({ ...s, id: 'mon', date: '2026-11-16' }),
      makeTask({ ...s, id: 'tue', date: '2026-11-17' }),
      makeTask({ ...s, id: 'wed', date: '2026-11-18' }),
    ]
    expect(applyOverdueRules(TODAY, tasks)).toEqual(['mon', 'tue'])
  })

  it('экземпляр серии переносится, пока следующий ещё в будущем', () => {
    const s = { source: 'series', seriesId: 's1' } as const
    const tasks = [makeTask({ ...s, id: 'mon', date: '2026-11-16' }), makeTask({ ...s, id: 'fri', date: '2026-11-20' })]
    expect(applyOverdueRules(TODAY, tasks)).toEqual([])
    expect(applyOverdueRules('2026-11-20', tasks)).toEqual(['mon'])
  })

  it('серия переносится через границу недели, в отличие от задач целей', () => {
    const tasks = [makeTask({ source: 'series', seriesId: 's1', id: 'old', date: '2026-11-10' })]
    expect(applyOverdueRules(TODAY, tasks)).toEqual([])
  })

  it('следующий экземпляр считается, даже если он уже выполнен; чужая серия не влияет', () => {
    const tasks = [
      makeTask({ source: 'series', seriesId: 's1', id: 'old', date: '2026-11-16' }),
      makeDone({ source: 'series', seriesId: 's1', id: 'new', date: '2026-11-17' }),
      makeTask({ source: 'series', seriesId: 's2', id: 'other', date: '2026-11-16' }),
    ]
    expect(applyOverdueRules(TODAY, tasks)).toEqual(['old'])
  })

  it('выполненные и уже пропущенные не трогаются', () => {
    const tasks = [
      makeDone({ id: 'a', source: 'goal', goalId: 'g1', date: '2026-11-02' }),
      makeTask({ id: 'b', source: 'goal', goalId: 'g1', date: '2026-11-02', status: 'skipped' }),
    ]
    expect(applyOverdueRules(TODAY, tasks)).toEqual([])
  })
})
