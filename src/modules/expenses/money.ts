import { useCurrency } from '../../app/units'
import { t } from '../../i18n'
import { useUiStore } from '../../store/uiStore'
import { formatMoney } from './domain'

/** Форматирование сумм в выбранной валюте и текущем языке; undefined, пока валюта читается */
export function useMoney(): ((minor: number) => string) | undefined {
  const lang = useUiStore((s) => s.lang)
  const currency = useCurrency(lang)
  if (!currency) return undefined
  return (minor) => formatMoney(minor, currency, t.localeTag, t.currencySymbols)
}

/** Десятичный разделитель текущего языка: «,» или «.» */
export const decimalSeparator = (): string =>
  new Intl.NumberFormat(t.localeTag).formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.'
