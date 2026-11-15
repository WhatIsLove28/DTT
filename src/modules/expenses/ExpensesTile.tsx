import { PlusIcon, WalletIcon } from '../../components/icons'
import { t } from '../../i18n'
import { useUiStore } from '../../store/uiStore'
import { monthOf, monthSummary, totalOn } from './domain'
import { useMoney } from './money'
import { useExpenses } from './store'

/** Плитка на главном экране: потрачено сегодня и за месяц, быстрый ввод расхода */
export function ExpensesTile({ wide, onOpen }: { wide: boolean; onOpen: (intent?: string) => void }) {
  const today = useUiStore((s) => s.today)
  const data = useExpenses()
  const money = useMoney()
  const todayTotal = data && money ? money(totalOn(data.expenses, today)) : '…'
  const monthTotal = data && money ? money(monthSummary(data.expenses, monthOf(today)).total) : '…'

  const addButton = (
    <button
      type="button"
      aria-label={t.expenses.add}
      onClick={(e) => {
        e.stopPropagation()
        onOpen('add')
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent active:opacity-60"
    >
      <span className="flex scale-90">
        <PlusIcon />
      </span>
    </button>
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
      }}
      className={`flex min-w-0 items-center gap-2 rounded-xl bg-surface text-left active:opacity-80 ${
        wide ? 'col-span-2 min-h-14 py-2 pl-4 pr-2.5' : 'py-2.5 pl-3 pr-2.5'
      }`}
    >
      {wide && (
        <span className="shrink-0 pr-1 text-accent">
          <WalletIcon />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[13px] text-muted">
          {!wide && (
            <span className="-ml-1 flex scale-[0.65] text-accent">
              <WalletIcon />
            </span>
          )}
          <span className="truncate">
            {t.expenses.title} · {t.expenses.tileToday}
          </span>
        </span>
        <span className="block truncate text-[19px] font-semibold tabular-nums leading-tight">{todayTotal}</span>
        <span className="block truncate text-[12px] text-muted">{t.expenses.tileMonth(monthTotal)}</span>
      </span>
      {addButton}
    </div>
  )
}
