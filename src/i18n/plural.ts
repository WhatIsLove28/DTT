/** Русская форма множественного числа: pluralRu(2, ['раз', 'раза', 'раз']) → 'раза' */
export function pluralRu(n: number, forms: [one: string, few: string, many: string]): string {
  const abs = Math.abs(n)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

/** Английская форма: pluralEn(1, 'day', 'days') → 'day' */
export function pluralEn(n: number, one: string, many: string): string {
  return Math.abs(n) === 1 ? one : many
}
