import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeGoal, makeSeries, makeTask } from '../domain/testFactories'
import { db } from './db'
import { goalsRepo, metaRepo, seriesRepo, tasksRepo } from './repositories'
import { LAST_GENERATED_WEEK, runSync } from './sync'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const byStatus = async (status: string) => (await tasksRepo.list()).filter((t) => t.status === status)

describe('runSync', () => {
  it('создаёт задачи текущей недели и не плодит дубли при повторном запуске', async () => {
    await goalsRepo.put(makeGoal({ weekStart: '2026-11-02', startDate: '2026-11-02' })) // пн/ср/пт
    await runSync('2026-11-04')
    await runSync('2026-11-04')
    await runSync('2026-11-05')
    const tasks = await tasksRepo.list()
    expect(tasks.map((t) => t.id).sort()).toEqual(['g:g1:2026-11-02', 'g:g1:2026-11-04', 'g:g1:2026-11-06'])
    expect(await metaRepo.get(LAST_GENERATED_WEEK)).toBe('2026-11-02')
  })

  it('не затирает статус уже существующих экземпляров', async () => {
    await goalsRepo.put(makeGoal({ weekStart: '2026-11-02', startDate: '2026-11-02' }))
    await runSync('2026-11-02')
    await tasksRepo.setStatus(['g:g1:2026-11-02'], 'done')
    await runSync('2026-11-03')
    expect((await tasksRepo.get('g:g1:2026-11-02'))?.status).toBe('done')
  })

  it('догенерирует пропущенные недели и сразу пропускает их задачи', async () => {
    await goalsRepo.put(makeGoal({ weekStart: '2026-11-02', startDate: '2026-11-02' }))
    await runSync('2026-11-04')
    // Приложение не открывали две недели; сегодня среда 18 ноября.
    await runSync('2026-11-18')

    expect(await tasksRepo.list()).toHaveLength(9)
    expect((await byStatus('skipped')).map((t) => t.date).sort()).toEqual([
      '2026-11-02',
      '2026-11-04',
      '2026-11-06',
      '2026-11-09',
      '2026-11-11',
      '2026-11-13',
    ])
    // Текущая неделя: понедельничная задача просрочена, но ещё открыта.
    expect((await byStatus('todo')).map((t) => t.date).sort()).toEqual(['2026-11-16', '2026-11-18', '2026-11-20'])
    expect(await metaRepo.get(LAST_GENERATED_WEEK)).toBe('2026-11-16')
  })

  it('серия: старый экземпляр пропускается, когда появился новый; ручные задачи остаются', async () => {
    await seriesRepo.put(makeSeries({ startDate: '2026-11-16' })) // ежедневно
    await tasksRepo.put(makeTask({ id: 'manual', date: '2026-10-01' }))
    await runSync('2026-11-18')

    expect((await tasksRepo.get('s:s1:2026-11-16'))?.status).toBe('skipped')
    expect((await tasksRepo.get('s:s1:2026-11-17'))?.status).toBe('skipped')
    expect((await tasksRepo.get('s:s1:2026-11-18'))?.status).toBe('todo')
    expect((await tasksRepo.get('manual'))?.status).toBe('todo')
  })

  it('первый запуск в пустой базе ничего не ломает', async () => {
    await runSync('2026-11-18')
    expect(await tasksRepo.list()).toEqual([])
    expect(await metaRepo.get(LAST_GENERATED_WEEK)).toBe('2026-11-16')
  })
})
