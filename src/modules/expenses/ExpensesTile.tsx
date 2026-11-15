import { WalletIcon } from '../../components/icons'
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
      onClick={(e) => {
        e.stopPropagation()
        onOpen('add')
      }}
      className={`flex h-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 px-3 text-[14px] font-semibold text-accent active:opacity-60 ${
        wide ? '' : 'mt-2.5 w-full'
      }`}
    >
      {t.expenses.addShort}
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
      className={`flex min-w-0 rounded-xl bg-surface text-left active:opacity-80 ${
        wide ? 'col-span-2 items-center gap-3 py-2 pl-4 pr-2' : 'flex-col p-3'
      }`}
    >
      {wide ? (
        <>
          <span className="shrink-0 text-accent">
            <WalletIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-muted">{t.expenses.title}</span>
            <span className="block truncate text-[16px]">
              {todayTotal} {t.expenses.tileToday} · {t.expenses.tileMonth(monthTotal)}
            </span>
          </span>
          {addButton}
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <span className="flex scale-75 text-accent">
              <WalletIcon />
            </span>
            {t.expenses.title}
          </span>
          <span className="truncate pt-1 text-[22px] font-semibold tabular-nums leading-tight">{todayTotal}</span>
          <span className="text-[13px] text-muted">{t.expenses.tileToday}</span>
          <span className="truncate pt-0.5 text-[13px] text-muted">{t.expenses.tileMonth(monthTotal)}</span>
          <span className="flex-1" />
          {addButton}
        </>
      )}
    </div>
  )
}
