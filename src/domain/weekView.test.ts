import { describe, expect, it } from 'vitest'
import { makeDone, makeTask } from './testFactories'
import { blockMinutes, displayDate, groupByDisplayDate, layoutDay, sortForDay } from './weekView'

describe('displayDate', () => {
  it('невыполненная задача стоит в своём плановом дне', () => {
    expect(displayDate(makeTask({ date: '2026-11-10' }))).toBe('2026-11-10')
  })

  it('выполненная задача стоит в фактическом дне, даже через границу недели и года', () => {
    expect(displayDate(makeDone({ date: '2026-11-13', completedAt: '2026-11-16T09:30:00' }))).toBe('2026-11-16')
    expect(displayDate(makeDone({ date: '2026-12-31', completedAt: '2027-01-01T00:10:00' }))).toBe('2027-01-01')
  })
})

describe('blockMinutes', () => {
  it('берёт фактическую длительность, если она есть, иначе плановую', () => {
    expect(blockMinutes(makeTask({ plannedDurationMin: 30 }))).toBe(30)
    expect(blockMinutes(makeDone({ plannedDurationMin: 30, actualDurationMin: 50 }))).toBe(50)
  })
})

describe('sortForDay', () => {
  it('сначала задачи со временем по порядку, затем без времени в исходном порядке', () => {
    const tasks = [
      makeTask({ id: 'a' }),
      makeTask({ id: 'b', startTime: '19:00' }),
      makeTask({ id: 'c' }),
      makeTask({ id: 'd', startTime: '07:30' }),
    ]
    expect(sortForDay(tasks).map((t) => t.id)).toEqual(['d', 'b', 'a', 'c'])
  })
})

describe('groupByDisplayDate', () => {
  it('раскладывает по дням, пропуская удалённые и чужие даты', () => {
    const map = groupByDisplayDate(
      [
        makeTask({ id: 'a', date: '2026-11-09' }),
        makeTask({ id: 'b', date: '2026-11-09', deleted: true, status: 'skipped' }),
        makeTask({ id: 'c', date: '2026-11-20' }),
        makeDone({ id: 'd', date: '2026-11-06', completedAt: '2026-11-10T08:00:00' }),
      ],
      ['2026-11-09', '2026-11-10'],
    )
    expect(map.get('2026-11-09')?.map((t) => t.id)).toEqual(['a'])
    expect(map.get('2026-11-10')?.map((t) => t.id)).toEqual(['d'])
  })
})

describe('layoutDay', () => {
  it('задачи без времени на шкалу не попадают', () => {
    expect(layoutDay([makeTask()])).toEqual([])
  })

  it('непересекающиеся задачи занимают всю ширину', () => {
    const blocks = layoutDay([
      makeTask({ id: 'a', startTime: '09:00', plannedDurationMin: 60 }),
      makeTask({ id: 'b', startTime: '10:00', plannedDurationMin: 30 }),
    ])
    expect(blocks.map((b) => [b.task.id, b.start, b.col, b.cols])).toEqual([
      ['a', 540, 0, 1],
      ['b', 600, 0, 1],
    ])
  })

  it('пересекающиеся задачи делят ширину, освободившаяся колонка используется снова', () => {
    const blocks = layoutDay([
      makeTask({ id: 'a', startTime: '09:00', plannedDurationMin: 120 }),
      makeTask({ id: 'b', startTime: '09:30', plannedDurationMin: 30 }),
      makeTask({ id: 'c', startTime: '10:15', plannedDurationMin: 30 }),
    ])
    expect(blocks.map((b) => [b.task.id, b.col, b.cols])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 1, 2],
    ])
  })

  it('блок не выходит за конец суток', () => {
    const [block] = layoutDay([makeTask({ startTime: '23:30', plannedDurationMin: 120 })])
    expect(block.minutes).toBe(30)
  })
})
