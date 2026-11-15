import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from '../../db/backup'
import { db } from '../../db/db'
import { parseBackup } from '../../domain/backup'
import { normalizeModules, setModuleEnabled } from '../settings'
import { addItem, clearDone, createList, deleteList, ensureDefaultList, toggleShoppingItem } from './store'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const names = async (listId: string) =>
  (await db.shoppingItems.where('listId').equals(listId).toArray()).map((i) => `${i.name}${i.qty ? ` x${i.qty}` : ''}`)

describe('список покупок в базе', () => {
  it('первый список создаётся один раз', async () => {
    await ensureDefaultList('Покупки')
    await ensureDefaultList('Покупки')
    expect(await db.shoppingLists.count()).toBe(1)
  })

  it('повторное добавление не плодит дубли и считает историю', async () => {
    const list = await createList('Продукты')
    await addItem(list, 'Молоко')
    await addItem(list, 'молоко 2')
    await addItem(list, '   ')
    expect(await names(list)).toEqual(['Молоко x2'])
    expect(await db.shoppingHistory.get('молоко')).toMatchObject({ count: 2 })
  })

  it('одинаковые позиции в разных списках независимы', async () => {
    const a = await createList('Продукты')
    const b = await createList('Стройка')
    await addItem(a, 'Клей')
    await addItem(b, 'Клей 3')
    expect(await names(a)).toEqual(['Клей'])
    expect(await names(b)).toEqual(['Клей x3'])
  })

  it('очистка убирает только купленное', async () => {
    const list = await createList('Продукты')
    await addItem(list, 'Хлеб')
    await addItem(list, 'Сыр')
    const bread = (await db.shoppingItems.toArray()).find((i) => i.name === 'Хлеб')!
    await toggleShoppingItem(bread)
    await clearDone(list)
    expect(await names(list)).toEqual(['Сыр'])
  })

  it('удаление списка убирает его позиции, история остаётся', async () => {
    const a = await createList('Продукты')
    const b = await createList('Стройка')
    await addItem(a, 'Хлеб')
    await addItem(b, 'Клей')
    await deleteList(b)
    expect((await db.shoppingLists.toArray()).map((l) => l.name)).toEqual(['Продукты'])
    expect((await db.shoppingItems.toArray()).map((i) => i.name)).toEqual(['Хлеб'])
    expect(await db.shoppingHistory.count()).toBe(2)
  })
})

describe('включённые модули', () => {
  it('включение и выключение', async () => {
    await setModuleEnabled('shopping', true)
    await setModuleEnabled('shopping', true)
    expect((await db.meta.get('modules'))?.value).toEqual(['shopping'])
    await setModuleEnabled('shopping', false)
    expect((await db.meta.get('modules'))?.value).toEqual([])
  })

  it('мусор и незнакомые модули отбрасываются', () => {
    expect(normalizeModules(undefined)).toEqual([])
    expect(normalizeModules('shopping')).toEqual([])
    expect(normalizeModules(['unknown', 'shopping', 'shopping'])).toEqual(['shopping'])
  })
})

describe('бэкап с модулями', () => {
  it('таблицы модулей переживают экспорт и импорт', async () => {
    const list = await createList('Продукты')
    await addItem(list, 'Молоко 2')
    await setModuleEnabled('shopping', true)

    const file = parseBackup(JSON.stringify(await exportBackup()))
    expect(file.version).toBe(2)
    await Promise.all(db.tables.map((t) => t.clear()))
    await importBackup(file)

    expect(await names(list)).toEqual(['Молоко x2'])
    expect(await db.shoppingHistory.count()).toBe(1)
    expect((await db.meta.get('modules'))?.value).toEqual(['shopping'])
  })

  it('бэкап версии 1 без раздела модулей импортируется и очищает данные модулей', async () => {
    const list = await createList('Продукты')
    await addItem(list, 'Молоко')
    const { modules: _modules, ...rest } = await exportBackup()
    const old = parseBackup(JSON.stringify({ ...rest, version: 1 }))
    expect(old.modules).toEqual({})
    await importBackup(old)
    expect(await db.shoppingItems.count()).toBe(0)
  })

  it('повреждённый раздел модулей отклоняется', async () => {
    const file = await exportBackup()
    expect(() => parseBackup(JSON.stringify({ ...file, modules: { shoppingItems: 'x' } }))).toThrow('shoppingItems')
    expect(() => parseBackup(JSON.stringify({ ...file, modules: [] }))).toThrow('modules')
  })
})
