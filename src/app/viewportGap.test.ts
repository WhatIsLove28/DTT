import { describe, expect, it } from 'vitest'
import { viewportGap } from './viewportGap'

const SCREEN = { width: 393, height: 852 }

describe('обход короткого окна на iOS', () => {
  it('окно короче дисплея на высоту строки состояния — разница возвращается', () => {
    expect(viewportGap(true, SCREEN, { width: 393, height: 793 })).toBe(59)
    expect(viewportGap(true, SCREEN, { width: 393, height: 802 })).toBe(50)
  })

  it('окно во весь дисплей — обхода нет', () => {
    expect(viewportGap(true, SCREEN, { width: 393, height: 852 })).toBe(0)
  })

  it('вне приложения с экрана «Домой» обход не включается', () => {
    expect(viewportGap(false, SCREEN, { width: 393, height: 793 })).toBe(0)
  })

  it('альбомная ориентация и чужая ширина окна не считаются', () => {
    expect(viewportGap(true, SCREEN, { width: 852, height: 393 })).toBe(0)
    expect(viewportGap(true, SCREEN, { width: 320, height: 793 })).toBe(0)
  })

  it('слишком малая или слишком большая разница — не эта ошибка', () => {
    expect(viewportGap(true, SCREEN, { width: 393, height: 840 })).toBe(0)
    expect(viewportGap(true, SCREEN, { width: 393, height: 500 })).toBe(0)
  })
})
