import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { Button, Chip, Field, inputClass } from '../../components/fields'
import { haptic } from '../../components/haptics'
import { CloseIcon, DotsIcon, PlusIcon } from '../../components/icons'
import { StatusIcon } from '../../components/StatusIcon'
import { t } from '../../i18n'
import { ModuleShell } from '../ModuleShell'
import { nameKey, splitItems, suggest } from './domain'
import {
  addItem,
  clearDone,
  createList,
  deleteItem,
  deleteList,
  ensureDefaultList,
  renameList,
  toggleShoppingItem,
  useShopping,
} from './store'
import type { ShoppingItem, ShoppingList } from './types'

function ItemRow({ item }: { item: ShoppingItem }) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-pressed={item.done}
        onClick={() => {
          haptic()
          void toggleShoppingItem(item)
        }}
        className="flex min-h-12 min-w-0 flex-1 items-center text-left active:opacity-70"
      >
        <StatusIcon
          view={
            item.done
              ? { tone: 'green', glyph: 'check', label: t.shopping.bought }
              : { tone: 'gray', glyph: 'empty', label: t.shopping.toBuy }
          }
        />
        <span className={`min-w-0 flex-1 truncate text-[16px] ${item.done ? 'text-muted line-through' : ''}`}>
          {item.name}
        </span>
        {item.qty && <span className="shrink-0 pl-2 text-[15px] tabular-nums text-muted">{item.qty}</span>}
      </button>
      <button
        type="button"
        aria-label={t.shopping.removeItem(item.name)}
        onClick={() => void deleteItem(item.id)}
        className="flex h-12 w-11 shrink-0 scale-75 items-center justify-center text-muted/70 active:opacity-60"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

interface ListFormProps {
  /** Без списка — создание нового */
  list?: ShoppingList
  lists: readonly ShoppingList[]
  itemCount: number
  onDone: (activeId?: string) => void
}

function ListForm({ list, lists, itemCount, onDone }: ListFormProps) {
  const [name, setName] = useState(list?.name ?? '')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string>()

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError(t.shopping.errListName)
    if (lists.some((l) => l.id !== list?.id && l.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError(t.shopping.errListDuplicate)
    }
    if (list) {
      await renameList(list, trimmed)
      onDone()
    } else {
      onDone(await createList(trimmed))
    }
  }

  return (
    <div>
      <Field label={t.common.name}>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.shopping.listPlaceholder}
          maxLength={30}
          enterKeyHint="done"
        />
      </Field>
      {error && <p className="pt-3 text-[14px] text-st-red">{error}</p>}
      <div className="flex flex-col gap-2 pt-5">
        <Button onClick={() => void save()}>{list ? t.common.save : t.shopping.createList}</Button>
        {list && !confirming && (
          <Button variant="danger" disabled={lists.length <= 1} onClick={() => setConfirming(true)}>
            {lists.length <= 1 ? t.shopping.cantDeleteOnly : t.shopping.deleteList}
          </Button>
        )}
        {list && confirming && (
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="pb-3 text-[14px]">{t.shopping.deleteListConfirm(list.name, itemCount)}</p>
            <div className="flex gap-2">
              <Button variant="plain" onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteList(list.id)
                  onDone()
                }}
              >
                {t.common.delete}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ShoppingScreen({ onClose }: { onClose: () => void }) {
  const data = useShopping()
  const [activeId, setActiveId] = useState<string>()
  const [text, setText] = useState('')
  const [form, setForm] = useState<'new' | 'edit' | null>(null)

  const noLists = data?.lists.length === 0
  useEffect(() => {
    if (noLists) void ensureDefaultList(t.shopping.defaultList)
  }, [noLists])

  const list = data?.lists.find((l) => l.id === activeId) ?? data?.lists[0]
  const listItems = useMemo(
    () => (data && list ? data.items.filter((i) => i.listId === list.id) : []),
    [data, list],
  )
  const { todo, done } = useMemo(() => splitItems(listItems), [listItems])
  const hints = useMemo(
    () => (data ? suggest(data.history, text, new Set(todo.map((i) => nameKey(i.name)))) : []),
    [data, text, todo],
  )

  const add = (value: string) => {
    if (!list || !value.trim()) return
    haptic()
    void addItem(list.id, value)
    setText('')
  }

  return (
    <ModuleShell
      title={t.shopping.title}
      onClose={onClose}
      action={
        list && (
          <button
            type="button"
            aria-label={t.shopping.listSettings}
            onClick={() => setForm('edit')}
            className="flex h-11 w-11 items-center justify-center text-accent active:opacity-60"
          >
            <DotsIcon />
          </button>
        )
      }
    >
      {data && list && (
        <>
          <div className="shrink-0 px-3 pt-1">
            <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-2.5">
              {data.lists.map((l) => (
                <Chip key={l.id} selected={l.id === list.id} onClick={() => setActiveId(l.id)}>
                  {l.name}
                </Chip>
              ))}
              <Chip selected={false} label={t.shopping.newList} onClick={() => setForm('new')}>
                <span className="-mx-1 flex scale-75">
                  <PlusIcon />
                </span>
              </Chip>
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                add(text)
              }}
            >
              <input
                className={inputClass}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.shopping.inputPlaceholder}
                aria-label={t.shopping.inputLabel}
                maxLength={60}
                enterKeyHint="done"
                autoCapitalize="sentences"
              />
              <button
                type="submit"
                aria-label={t.shopping.add}
                disabled={!text.trim()}
                className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white active:opacity-70 disabled:opacity-40"
              >
                <PlusIcon />
              </button>
            </form>

            {hints.length > 0 && (
              <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pt-2.5">
                {hints.map((h) => (
                  <Chip key={h.key} selected={false} onClick={() => add(h.name)}>
                    {h.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
            {listItems.length === 0 && (
              <div className="rounded-xl bg-surface px-4 py-5 text-center text-[15px] text-muted">{t.shopping.empty}</div>
            )}
            {todo.length > 0 && (
              <div className="divide-y divide-line rounded-xl bg-surface">
                {todo.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            )}
            {todo.length === 0 && done.length > 0 && (
              <div className="rounded-xl bg-surface px-4 py-4 text-center text-[15px] text-muted">{t.shopping.allBought}</div>
            )}
            {done.length > 0 && (
              <>
                <div className="flex items-center justify-between pl-1 pt-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                    {t.shopping.boughtCount(done.length)}
                  </h2>
                  <button
                    type="button"
                    onClick={() => void clearDone(list.id)}
                    className="h-9 px-2 text-[15px] text-accent active:opacity-60"
                  >
                    {t.shopping.clearBought}
                  </button>
                </div>
                <div className="divide-y divide-line rounded-xl bg-surface">
                  {done.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
            <div className="pb-safe" />
          </div>

          <BottomSheet
            open={form !== null}
            title={form === 'new' ? t.shopping.newList : t.shopping.listSettings}
            onClose={() => setForm(null)}
          >
            {form && (
              <ListForm
                key={form === 'new' ? 'new' : list.id}
                list={form === 'edit' ? list : undefined}
                lists={data.lists}
                itemCount={listItems.length}
                onDone={(id) => {
                  if (id) setActiveId(id)
                  setForm(null)
                }}
              />
            )}
          </BottomSheet>
        </>
      )}
    </ModuleShell>
  )
}
