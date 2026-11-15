import { useEffect, useState } from 'react'

/** Размер в пикселях, который браузер даёт CSS-выражению (dvh, env() и т. п.) */
function measure(css: string): number {
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:${css}`
  document.body.appendChild(probe)
  const height = probe.getBoundingClientRect().height
  probe.remove()
  return Math.round(height)
}

function collect(): [string, string | number][] {
  const shell = document.querySelector('#root > div')?.getBoundingClientRect()
  return [
    ['standalone', String(matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)],
    ['screen', `${screen.width}×${screen.height}`],
    ['inner', `${innerWidth}×${innerHeight}`],
    ['visualViewport', `${Math.round(visualViewport?.height ?? 0)} (top ${Math.round(visualViewport?.offsetTop ?? 0)})`],
    ['html client', document.documentElement.clientHeight],
    ['body', Math.round(document.body.getBoundingClientRect().height)],
    ['100vh', measure('100vh')],
    ['100dvh', measure('100dvh')],
    ['100lvh', measure('100lvh')],
    ['100%', measure('100%')],
    ['inset top', measure('env(safe-area-inset-top)')],
    ['inset bottom', measure('env(safe-area-inset-bottom)')],
    ['viewport gap', getComputedStyle(document.documentElement).getPropertyValue('--viewport-gap') || '—'],
    ['shell', shell ? `${Math.round(shell.top)}…${Math.round(shell.bottom)}` : '—'],
    ['ua', navigator.userAgent.replace(/^.*?\((.*?)\).*?(Version\/[\d.]+)?.*$/, '$1 $2')],
  ]
}

/**
 * Служебные сведения об экране для разбора проблем с раскладкой на конкретном устройстве.
 * Открываются тапом по строке версии в настройках; на английском, как любой отладочный вывод.
 */
export function Diagnostics() {
  const [rows, setRows] = useState(collect)
  useEffect(() => {
    const update = () => setRows(collect())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return (
    <div className="mx-auto mt-2 max-w-sm rounded-xl bg-surface p-3 text-left font-mono text-[12px] leading-relaxed text-fg">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <span className="shrink-0 text-muted">{label}</span>
          <span className="min-w-0 break-words text-right">{value}</span>
        </div>
      ))}
    </div>
  )
}
