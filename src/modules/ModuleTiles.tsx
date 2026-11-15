import { t } from '../i18n'
import { useUiStore } from '../store/uiStore'
import { moduleById } from './registry'
import { useEnabledModules } from './settings'

/** Раздел «Модули» на главном экране: плитки по две в ряд, нечётная последняя — на всю ширину */
export function ModuleTiles() {
  const enabled = useEnabledModules()
  const openModule = useUiStore((s) => s.openModule)
  const modules = (enabled ?? []).flatMap((id) => moduleById(id) ?? [])
  if (modules.length === 0) return null

  return (
    <>
      <h2 className="px-1 pb-1.5 pt-5 text-[13px] font-semibold uppercase tracking-wide text-muted">{t.modules.title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {modules.map(({ id, Tile }, i) => (
          <Tile
            key={id}
            wide={modules.length % 2 === 1 && i === modules.length - 1}
            onOpen={(intent) => openModule(id, intent)}
          />
        ))}
      </div>
    </>
  )
}
