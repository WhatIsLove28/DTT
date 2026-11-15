import { describe, expect, it } from 'vitest'
import { addDaysISO, isoWeekday, weekDates, weekStartOf } from './dates'
import { isGoalActiveInWeek, isGoalActiveOn, isScheduledOn, isSeriesActiveOn } from './recurrence'
import { makeGoal, makeSeries } from './testFactories'

describe('даты', () => {
  it('неделя начинается с понедельника', () => {
    expect(weekStartOf('2026-11-14')).toBe('2026-11-09') // суббота
    expect(weekStartOf('2026-11-15')).toBe('2026-11-09') // воскресенье
    expect(weekStartOf('2026-11-16')).toBe('2026-11-16') // понедельник
    expect(isoWeekday('2026-11-09')).toBe(1)
    expect(isoWeekday('2026-11-15')).toBe(7)
  })

  it('неделя через границу года', () => {
    expect(weekStartOf('2027-01-01')).toBe('2026-12-28')
    expect(weekDates('2026-12-28')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ])
  })

  it('сложение дней через границу месяца', () => {
    expect(addDaysISO('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDaysISO('2027-03-01', -1)).toBe('2027-02-28')
  })
})

describe('isScheduledOn', () => {
  it('daily — каждый день начиная со старта', () => {
    expect(isScheduledOn({ type: 'daily' }, '2026-11-11', '2026-11-10')).toBe(false)
    expect(isScheduledOn({ type: 'daily' }, '2026-11-11', '2026-11-11')).toBe(true)
    expect(isScheduledOn({ type: 'daily' }, '2026-11-11', '2026-12-25')).toBe(true)
  })

  it('«через день» отсчитывается от даты старта, а не от понедельника', () => {
    const r = { type: 'every_n_days', interval: 2 } as const
    const start = '2026-11-11' // среда
    expect(isScheduledOn(r, start, '2026-11-11')).toBe(true)
    expect(isScheduledOn(r, start, '2026-11-12')).toBe(false)
    expect(isScheduledOn(r, start, '2026-11-13')).toBe(true)
    expect(isScheduledOn(r, start, '2026-11-15')).toBe(true) // воскресенье
    expect(isScheduledOn(r, start, '2026-11-16')).toBe(false) // понедельник новой недели
    expect(isScheduledOn(r, start, '2026-11-17')).toBe(true)
  })

  it('«через день» через границу месяца', () => {
    const r = { type: 'every_n_days', interval: 2 } as const
    expect(isScheduledOn(r, '2026-11-29', '2026-11-30')).toBe(false)
    expect(isScheduledOn(r, '2026-11-29', '2026-12-01')).toBe(true)
  })

  it('каждые 3 дня через границу года', () => {
    const r = { type: 'every_n_days', interval: 3 } as const
    expect(isScheduledOn(r, '2026-12-30', '2027-01-01')).toBe(false)
    expect(isScheduledOn(r, '2026-12-30', '2027-01-02')).toBe(true)
    expect(isScheduledOn(r, '2026-12-30', '2027-01-05')).toBe(true)
  })

  it('пн/ср/пт', () => {
    const r = { type: 'weekdays', weekdays: [1, 3, 5] } as const
    const start = '2026-11-09'
    expect(weekDates(start).filter((d) => isScheduledOn({ ...r, weekdays: [...r.weekdays] }, start, d))).toEqual([
      '2026-11-09',
      '2026-11-11',
      '2026-11-13',
    ])
  })

  it('none и times_per_week не имеют фиксированных дней', () => {
    expect(isScheduledOn({ type: 'none' }, '2026-11-09', '2026-11-09')).toBe(false)
    expect(isScheduledOn({ type: 'times_per_week', timesPerWeek: 3 }, '2026-11-09', '2026-11-10')).toBe(false)
  })
})

describe('срок действия цели', () => {
  it('цель без повтора живёт до конца недели создания', () => {
    const goal = makeGoal({ repeatWeekly: false, weekStart: '2026-11-09', startDate: '2026-11-11' })
    expect(isGoalActiveOn(goal, '2026-11-10')).toBe(false) // до создания
    expect(isGoalActiveOn(goal, '2026-11-11')).toBe(true)
    expect(isGoalActiveOn(goal, '2026-11-15')).toBe(true)
    expect(isGoalActiveOn(goal, '2026-11-16')).toBe(false)
    expect(isGoalActiveInWeek(goal, '2026-11-02')).toBe(false)
    expect(isGoalActiveInWeek(goal, '2026-11-09')).toBe(true)
    expect(isGoalActiveInWeek(goal, '2026-11-16')).toBe(false)
  })

  it('цель с повтором действует и в следующих неделях', () => {
    const goal = makeGoal()
    expect(isGoalActiveOn(goal, '2026-11-16')).toBe(true)
    expect(isGoalActiveInWeek(goal, '2027-01-04')).toBe(true)
  })

  it('отключение повтора: endDate обрезает будущее, история остаётся', () => {
    const goal = makeGoal({ repeatWeekly: false, endDate: '2026-11-18' }) // среда второй недели
    expect(isGoalActiveOn(goal, '2026-11-10')).toBe(true)
    expect(isGoalActiveOn(goal, '2026-11-18')).toBe(true)
    expect(isGoalActiveOn(goal, '2026-11-19')).toBe(false)
    expect(isGoalActiveInWeek(goal, '2026-11-09')).toBe(true)
    expect(isGoalActiveInWeek(goal, '2026-11-16')).toBe(true)
    expect(isGoalActiveInWeek(goal, '2026-11-23')).toBe(false)
  })

  it('серия действует от startDate до endDate включительно', () => {
    const series = makeSeries({ startDate: '2026-11-10', endDate: '2026-11-12' })
    expect(isSeriesActiveOn(series, '2026-11-09')).toBe(false)
    expect(isSeriesActiveOn(series, '2026-11-12')).toBe(true)
    expect(isSeriesActiveOn(series, '2026-11-13')).toBe(false)
  })
})
