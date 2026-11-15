import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { BottomSheet } from '../../components/BottomSheet'
import { Button } from '../../components/fields'
import { ChevronLeftIcon, ChevronRightIcon, DotsIcon } from '../../components/icons'
import { fromISODate } from '../../domain/dates'
import { FALLBACK_COLOR } from '../../domain/palette'
import { dateLocale, formatDate, t } from '../../i18n'
import { useUiStore } from '../../store/uiStore'
import { ModuleShell } from '../ModuleShell'
import { budgetState, groupByDay, monthOf, monthStart, monthSummary, shiftMonth } from './domain'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseSettings } from './ExpenseSettings'
import { useMoney } from './money'
import { ensureDefaultCategories, useExpenses } from './store'
import type { Expense } from './types'

type Sheet = { kind: 'expense'; expense?: Expense } | { kind: 'settings' }

export function ExpensesScreen({ onClose, intent }: { onClose: () => void; intent?: string }) {
  const today = useUiStore((s) => s.today)
  const data = useExpenses()
  const money = useMoney()
  const [month, setMonth] = useState(monthOf(today))
  const [sheet, setSheet] = useState<Sheet | null>(intent === 'add' ? { kind: 'expense' } : null)

  const noCategories = data?.categories.length === 0
  useEffect(() => {
    if (noCategories) void ensureDefaultCategories(t.expenses.defaultCategories)
  }, [noCategories])

  const summary = useMemo(() => (data ? monthSummary(data.expenses, month) : undefined), [data, month])
  const days = useMemo(() => (data ? groupByDay(data.expenses, month) : []), [data, month])
  const categories = useMemo(() => new Map(data?.categories.map((c) => [c.id, c])), [data])
  const budget = summary ? budgetState(summary.total, data?.budget) : undefined

  const navButton = 'flex h-10 w-11 items-center justify-center text-accent active:opacity-60'
  const ready = data && money && summary

  return (
    <ModuleShell
      title={t.expenses.title}
      onClose={onClose}
      action={
        <button
          type="button"
          aria-label={t.expenses.settings}
          onClick={() => setSheet({ kind: 'settings' })}
          className="flex h-11 w-11 items-center justify-center text-accent active:opacity-60"
        >
          <DotsIcon />
        </button>
      }
    >
      {ready && (
        <>
          <div className="flex shrink-0 items-center justify-between px-1.5">
            <button type="button" aria-label={t.expenses.prevMonth} onClick={() => setMonth(shiftMonth(month, -1))} className={navButton}>
              <ChevronLeftIcon />
            </button>
            <span className="text-[16px] font-medium first-letter:uppercase">
              {format(fromISODate(monthStart(month)), 'LLLL yyyy', { locale: dateLocale })}
            </span>
            <button type="button" aria-label={t.expenses.nextMonth} onClick={() => setMonth(shiftMonth(month, 1))} className={navButton}>
              <ChevronRightIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <div className="rounded-xl bg-surface p-4">
              <div className="text-[13px] text-muted">{t.expenses.monthTotal}</div>
              <div className="text-[30px] font-bold tabular-nums leading-tight">{money(summary.total)}</div>
              {budget && data.budget && (
                <>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${budget.over ? 'bg-st-red' : 'bg-st-green'}`}
                      style={{ width: `${budget.ratio * 100}%` }}
                    />
                  </div>
                  <div className={`pt-1.5 text-[13px] ${budget.over ? 'font-medium text-st-red' : 'text-muted'}`}>
                    {budget.over
                      ? t.expenses.budgetOver(money(-budget.left), money(data.budget))
                      : t.expenses.budgetLeft(money(budget.left), money(data.budget))}
                  </div>
                </>
              )}
            </div>

            {summary.byCategory.length > 0 && (
              <div className="mt-2 flex flex-col gap-2.5 rounded-xl bg-surface p-4">
                {summary.byCategory.map(({ categoryId, total, share }) => {
                  const color = categories.get(categoryId)?.color ?? FALLBACK_COLOR
                  return (
                    <div key={categoryId}>
                      <div className="flex items-baseline justify-between gap-2 text-[15px]">
                        <span className="min-w-0 truncate">{categories.get(categoryId)?.name ?? '—'}</span>
                        <span className="shrink-0 tabular-nums">
                          {money(total)} <span className="text-[13px] text-muted">· {Math.round(share * 100)} %</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(2, share * 100)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {days.length === 0 && (
              <div className="mt-2 rounded-xl bg-surface px-4 py-5 text-center text-[15px] text-muted">{t.expenses.empty}</div>
            )}

            {days.map((day) => (
              <div key={day.date}>
                <div className="flex items-baseline justify-between px-1 pb-1.5 pt-4 text-[13px] font-semibold uppercase tracking-wide text-muted">
                  <span>{day.date === today ? t.common.today : formatDate(day.date, 'shortWeekdayDayMonth')}</span>
                  <span className="tabular-nums">{money(day.total)}</span>
                </div>
                <div className="divide-y divide-line rounded-xl bg-surface">
                  {day.items.map((e) => {
                    const category = categories.get(e.categoryId)
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSheet({ kind: 'expense', expense: e })}
                        className="flex min-h-12 w-full items-center gap-3 px-4 py-1.5 text-left active:opacity-70"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: category?.color ?? FALLBACK_COLOR }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px]">{e.note ?? category?.name ?? '—'}</span>
                          {e.note && <span className="block truncate text-[13px] text-muted">{category?.name}</span>}
                        </span>
                        <span className="shrink-0 text-[16px] font-medium tabular-nums">{money(e.amount)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 px-3 pt-2">
            <Button onClick={() => setSheet({ kind: 'expense' })}>{t.expenses.add}</Button>
            <div className="pb-safe min-h-3" />
          </div>

          <BottomSheet
            open={sheet !== null}
            title={
              sheet?.kind === 'settings'
                ? t.expenses.settings
                : sheet?.expense
                  ? t.expenses.editExpense
                  : t.expenses.newExpense
            }
            onClose={() => setSheet(null)}
          >
            {sheet?.kind === 'expense' && (
              <ExpenseForm
                key={sheet.expense?.id ?? 'new'}
                expense={sheet.expense}
                categories={data.categories}
                // Новый расход в прошлом месяце по умолчанию ставится на сегодня: так вводят чаще всего.
                today={today}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet?.kind === 'settings' && <ExpenseSettings data={data} onClose={() => setSheet(null)} />}
          </BottomSheet>
        </>
      )}
    </ModuleShell>
  )
}
