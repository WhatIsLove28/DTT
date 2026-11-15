import { useState } from 'react'
import { Button, inputClass } from '../../components/fields'
import { haptic } from '../../components/haptics'
import type { ISODate } from '../../domain/types'
import { t } from '../../i18n'
import { amountToInput, keypadPress, parseAmount } from './domain'
import { decimalSeparator } from './money'
import { addExpense, deleteExpense, updateExpense } from './store'
import type { Expense, ExpenseCategory } from './types'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

interface ExpenseFormProps {
  /** Без расхода — создание нового */
  expense?: Expense
  categories: readonly ExpenseCategory[]
  today: ISODate
  onClose: () => void
}

/**
 * Ввод расхода: сумма на своей цифровой клавиатуре, затем категория.
 * У нового расхода тап по категории сразу сохраняет запись — два касания на весь ввод.
 */
export function ExpenseForm({ expense, categories, today, onClose }: ExpenseFormProps) {
  const [amount, setAmount] = useState(expense ? amountToInput(expense.amount) : '')
  const [date, setDate] = useState(expense?.date ?? today)
  const [note, setNote] = useState(expense?.note ?? '')
  const [categoryId, setCategoryId] = useState(expense?.categoryId)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string>()
  const separator = decimalSeparator()

  const save = async (category: string | undefined) => {
    const value = parseAmount(amount)
    if (!value) return setError(t.expenses.errAmount)
    if (!category) return setError(t.common.chooseCategory)
    if (!date) return setError(t.taskEditor.errDate)
    const input = { amount: value, categoryId: category, date, note }
    await (expense ? updateExpense(expense, input) : addExpense(input))
    haptic()
    onClose()
  }

  const press = (key: string) => {
    haptic()
    setError(undefined)
    setAmount((current) => keypadPress(current, key))
  }

  return (
    <div>
      <div
        aria-live="polite"
        aria-label={t.expenses.amount}
        className={`py-2 text-center text-[40px] font-semibold tabular-nums leading-tight ${amount ? '' : 'text-muted/50'}`}
      >
        {amount ? amount.replace('.', separator) : '0'}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-label={key === 'back' ? t.expenses.backspace : undefined}
            onClick={() => press(key)}
            className="flex h-12 items-center justify-center rounded-xl bg-surface text-[22px] font-medium tabular-nums active:bg-line"
          >
            {key === 'back' ? '⌫' : key === '.' ? separator : key}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-3">
        <input
          type="date"
          aria-label={t.taskEditor.date}
          className={`${inputClass} max-w-40`}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className={inputClass}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.expenses.notePlaceholder}
          aria-label={t.expenses.note}
          maxLength={60}
          enterKeyHint="done"
        />
      </div>

      <div className="pb-1.5 pt-3.5 text-[13px] font-medium text-muted">
        {expense ? t.common.category : t.expenses.pickCategory}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const selected = c.id === categoryId
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCategoryId(c.id)
                setError(undefined)
                if (!expense) void save(c.id)
              }}
              className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-medium ${
                selected ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-fg'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/60" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          )
        })}
      </div>

      {error && <p className="pt-3 text-[14px] text-st-red">{error}</p>}

      {expense && (
        <div className="flex flex-col gap-2 pt-5">
          <Button onClick={() => void save(categoryId)}>{t.common.save}</Button>
          {!confirming ? (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              {t.common.delete}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="plain" onClick={() => setConfirming(false)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteExpense(expense.id)
                  onClose()
                }}
              >
                {t.expenses.deleteForever}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
