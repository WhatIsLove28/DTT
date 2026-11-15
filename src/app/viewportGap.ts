// Ошибка iOS: в приложении с экрана «Домой», которое рисуется под строкой состояния, окно может
// быть короче дисплея на высоту этой строки — внизу остаётся полоса, в которой iOS ничего не рисует
// (вынести туда содержимое нельзя: оно обрезается). Разницу кладём в CSS-переменную --viewport-gap;
// нижние отступы уменьшаются на неё, потому что системная полоска жеста остаётся в этой полосе.

/** Разница вне этих пределов — не эта ошибка, а что-то другое (клавиатура, разделённый экран) */
const MIN_GAP = 20
const MAX_GAP = 90

/** На сколько пикселей окно короче дисплея; 0, если ошибки нет или её нельзя уверенно распознать */
export function viewportGap(
  standalone: boolean,
  screenSize: { width: number; height: number },
  inner: { width: number; height: number },
): number {
  // screen.width/height на iOS не меняются при повороте, поэтому сравниваем только в портрете.
  if (!standalone || inner.width > inner.height || inner.width !== screenSize.width) return 0
  const gap = screenSize.height - inner.height
  return gap >= MIN_GAP && gap <= MAX_GAP ? gap : 0
}

function currentGap(): number {
  // navigator.standalone есть только в Safari на iOS — заодно это проверка платформы.
  const standalone = (navigator as { standalone?: boolean }).standalone === true
  return viewportGap(standalone, screen, { width: window.innerWidth, height: window.innerHeight })
}

/** Следит за размерами окна и держит --viewport-gap актуальной */
export function watchViewportGap(): void {
  const apply = () => document.documentElement.style.setProperty('--viewport-gap', `${currentGap()}px`)
  apply()
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', apply)
}
