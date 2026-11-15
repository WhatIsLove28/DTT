/** Палитра категорий: 12 цветов */
export const PALETTE: readonly string[] = [
  '#ff3b30',
  '#ff9500',
  '#ffcc00',
  '#34c759',
  '#00c7be',
  '#30b0c7',
  '#007aff',
  '#5856d6',
  '#af52de',
  '#ff2d55',
  '#a2845e',
  '#8e8e93',
]

export const FALLBACK_COLOR = '#8e8e93'

/** Цвет текста, читаемый на фоне цвета категории */
export function textOn(hex: string): '#ffffff' | '#1c1c1e' {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.68 ? '#1c1c1e' : '#ffffff'
}
