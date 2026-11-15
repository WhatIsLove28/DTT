import { CartIcon, ChevronRightIcon } from '../../components/icons'
import { t } from '../../i18n'
import { splitItems } from './domain'
import { useShopping } from './store'

/** Плитка на главном экране: сколько осталось купить и что именно */
export function ShoppingTile({ wide, onOpen }: { wide: boolean; onOpen: () => void }) {
  const data = useShopping()
  const todo = data ? splitItems(data.items).todo : []
  const names = todo.map((i) => i.name).join(', ')
  const summary = todo.length === 0 ? t.shopping.tileEmpty : t.shopping.tileLeft(todo.length)

  if (wide) {
    return (
      <button
        type="button"
        onClick={() => onOpen()}
        className="col-span-2 flex min-h-14 w-full items-center gap-3 rounded-xl bg-surface py-2 pl-4 pr-2 text-left active:opacity-70"
      >
        <span className="shrink-0 text-accent">
          <CartIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-muted">{t.shopping.title}</span>
          <span className="block truncate text-[16px]">{names ? `${summary}: ${names}` : summary}</span>
        </span>
        <span className="shrink-0 text-muted/60">
          <ChevronRightIcon />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpen()}
      className="flex min-w-0 flex-col rounded-xl bg-surface p-3 text-left active:opacity-70"
    >
      <span className="flex items-center gap-1.5 text-[13px] text-muted">
        <span className="flex scale-75 text-accent">
          <CartIcon />
        </span>
        {t.shopping.title}
      </span>
      <span className="pt-1 text-[24px] font-semibold tabular-nums leading-tight">{todo.length}</span>
      <span className="w-full truncate text-[13px] text-muted">{names || t.shopping.tileEmpty}</span>
    </button>
  )
}
