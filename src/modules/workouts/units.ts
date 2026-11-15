import { useUnitSystem } from '../../app/units'
import { t } from '../../i18n'
import type { UnitLabels } from './domain'

/** Подписи единиц веса и дистанции в выбранной системе мер; undefined, пока настройка читается */
export function useUnitLabels(): UnitLabels | undefined {
  const system = useUnitSystem()
  if (!system) return undefined
  return system === 'imperial'
    ? { weight: t.workouts.lb, distance: t.workouts.mi }
    : { weight: t.workouts.kg, distance: t.workouts.km }
}
