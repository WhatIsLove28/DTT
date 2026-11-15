import { useState } from 'react'
import { Button, Field, inputClass } from '../../components/fields'
import { ChevronRightIcon, PlusIcon } from '../../components/icons'
import { PALETTE } from '../../domain/palette'
import { t } from '../../i18n'
import { amountToInput, parseAmount } from './domain'
import { decimalSeparator } from './money'
import { deleteExpenseCategory, saveExpenseCategory, setBudget, type ExpensesData } from './store'
import type { ExpenseCategory } from './types'

function CategoryForm({ category, data, onDone }: { category?: ExpenseCategory; data: ExpensesData; onDone: () => void }) {
  const others = data.categories.filter((c) => c.id !== category?.id)
  const used = new Set(data.categories.map((c) => c.color))
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? PALETTE.find((c) => !used.has(c)) ?? PALETTE[0])
  const [deleting, setDeleting] = useState(false)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  const [error, setError] = useState<string>()
  const usage = category ? data.expenses.filter((e) => e.categoryId === category.id).length : 0

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError(t.settings.errName)
    if (others.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return setError(t.settings.errDuplicate)
    await saveExpenseCategory({ id: category?.id, name: trimmed, color })
    onDone()
  }

  return (
    <div>
      <Field label={t.common.name}>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.expenses.categoryPlaceholder}
          maxLength={24}
          enterKeyHint="done"
        />
      </Field>
      <Field label={t.settings.color}>
        <div className="grid grid-cols-6 gap-2.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t.settings.colorAria(c)}
              aria-pressed={c === color}
              onClick={() => setColor(c)}
              className="flex aspect-square items-center justify-center rounded-full"
              style={{ backgroundColor: c }}
            >
              {c === color && <span className="h-1/3 w-1/3 rounded-full bg-white shadow" />}
            </button>
          ))}
        </div>
      </Field>
      {error && <p className="pt-3 text-[14px] text-st-red">{error}</p>}
      <div className="flex flex-col gap-2 pt-5">
        <Button onClick={() => void save()}>{category ? t.common.save : t.settings.addCategory}</Button>
        <Button variant="plain" onClick={onDone}>
          {t.common.cancel}
        </Button>
        {category && !deleting && (
          <Button variant="danger" disabled={others.length === 0} onClick={() => setDeleting(true)}>
            {others.length === 0 ? t.settings.cantDeleteOnly : t.settings.deleteCategory}
          </Button>
        )}
        {category && deleting && (
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="pb-2 text-[14px]">{usage > 0 ? t.expenses.categoryUsage(usage) : t.expenses.categoryEmpty}</p>
            {usage > 0 && (
              <select
                aria-label={t.settings.moveTo}
                className={inputClass}
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
              >
                {others.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2 pt-3">
              <Button variant="plain" onClick={() => setDeleting(false)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteExpenseCategory(category.id, moveTo)
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

/** Окно «Бюджет и категории» */
export function ExpenseSettings({ data, onClose }: { data: ExpensesData; onClose: () => void }) {
  const separator = decimalSeparator()
  const [budget, setBudgetText] = useState(data.budget ? amountToInput(data.budget).replace('.', separator) : '')
  const [editing, setEditing] = useState<{ category?: ExpenseCategory } | null>(null)
  const [error, setError] = useState<string>()

  if (editing) {
    return (
      <CategoryForm
        key={editing.category?.id ?? 'new'}
        category={editing.category}
        data={data}
        onDone={() => setEditing(null)}
      />
    )
  }

  const save = async () => {
    const value = budget.trim() === '' ? undefined : parseAmount(budget)
    if (budget.trim() !== '' && !value) return setError(t.expenses.errBudget)
    await setBudget(value)
    onClose()
  }

  return (
    <div>
      <Field label={t.expenses.budget} hint={t.expenses.budgetHint}>
        <input
          className={inputClass}
          inputMode="decimal"
          value={budget}
          onChange={(e) => {
            setBudgetText(e.target.value)
            setError(undefined)
          }}
          placeholder={t.expenses.budgetPlaceholder}
          aria-label={t.expenses.budget}
          enterKeyHint="done"
        />
      </Field>
      {error && <p className="pt-2 text-[14px] text-st-red">{error}</p>}

      <Field label={t.expenses.categories}>
        <div className="divide-y divide-line rounded-xl border border-line bg-surface">
          {data.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setEditing({ category: c })}
              className="flex h-11 w-full items-center gap-3 pl-3.5 pr-1.5 text-left active:opacity-60"
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="min-w-0 flex-1 truncate text-[16px]">{c.name}</span>
              <span className="text-muted/60">
                <ChevronRightIcon />
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEditing({})}
            className="flex h-11 w-full items-center gap-2 pl-2.5 text-left text-[16px] text-accent active:opacity-60"
          >
            <PlusIcon />
            {t.settings.addCategory}
          </button>
        </div>
      </Field>

      <div className="pt-5">
        <Button onClick={() => void save()}>{t.common.save}</Button>
      </div>
    </div>
  )
}
