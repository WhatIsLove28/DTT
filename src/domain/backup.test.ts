import { describe, expect, it } from 'vitest'
import { backupFileName, buildBackup, daysSinceBackup, parseBackup } from './backup'
import { makeGoal, makeSeries, makeTask } from './testFactories'

const data = {
  categories: [{ id: 'c1', name: 'Спорт', color: '#ff9500' }],
  goals: [makeGoal()],
  series: [makeSeries()],
  tasks: [makeTask()],
  meta: [{ key: 'lastGeneratedWeek', value: '2026-11-09' }],
}

describe('бэкап', () => {
  it('экспорт и разбор дают те же данные', () => {
    const file = buildBackup(data, new Date(2026, 10, 14, 10, 0))
    const parsed = parseBackup(JSON.stringify(file))
    expect(parsed).toEqual(file)
    expect(backupFileName(new Date(2026, 10, 14))).toBe('tracker-backup-2026-11-14.json')
  })

  it('отклоняет не-JSON, чужие файлы и файлы из будущей версии', () => {
    expect(() => parseBackup('не json')).toThrow('не JSON')
    expect(() => parseBackup('{"tasks": []}')).toThrow('не файл бэкапа')
    expect(() => parseBackup(JSON.stringify({ ...buildBackup(data), version: 99 }))).toThrow('более новой версии')
  })

  it('отклоняет повреждённые разделы', () => {
    const file = buildBackup(data)
    expect(() => parseBackup(JSON.stringify({ ...file, goals: undefined }))).toThrow('цели')
    expect(() => parseBackup(JSON.stringify({ ...file, tasks: [{ id: 't1' }] }))).toThrow('задачи')
    expect(() => parseBackup(JSON.stringify({ ...file, categories: [{ name: 'без id' }] }))).toThrow('категории')
  })

  it('считает дни с последнего бэкапа, в том числе через границу года', () => {
    expect(daysSinceBackup(undefined)).toBeUndefined()
    expect(daysSinceBackup('мусор')).toBeUndefined()
    expect(daysSinceBackup(new Date(2026, 10, 14, 9).toISOString(), new Date(2026, 10, 14, 23))).toBe(0)
    expect(daysSinceBackup(new Date(2026, 11, 30, 9).toISOString(), new Date(2027, 0, 2, 8))).toBe(3)
  })
})
