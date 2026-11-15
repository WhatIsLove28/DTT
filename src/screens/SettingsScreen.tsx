import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import type { Theme } from '../app/theme'
import { Button, Field, inputClass, Segmented, Toggle } from '../components/fields'
import {
  CURRENCIES,
  setCurrency,
  setUnitSystem,
  useCurrency,
  useUnitSystem,
  type Currency,
  type UnitSystem,
} from '../app/units'
import { ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../components/icons'
import { deleteCategory, saveCategory } from '../db/actions'
import { exportBackup, importBackup, markBackupDone } from '../db/backup'
import { useLastBackupAt, type AppData } from '../db/hooks'
import { backupFileName, daysSinceBackup, parseBackup, type BackupFile } from '../domain/backup'
import { PALETTE } from '../domain/palette'
import type { Category } from '../domain/types'
import { LANG_NAMES, t, type LangSetting } from '../i18n'
import { MODULES } from '../modules/registry'
import { moveModule, setModuleEnabled, useEnabledModules } from '../modules/settings'
import { useUiStore } from '../store/uiStore'

function SectionTitle({ children }: { children: string }) {
  return <h2 className="px-1 pb-1.5 pt-5 text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>
}

interface CategoryFormProps {
  category?: Category
  data: AppData
  onClose: () => void
}

function CategoryForm({ category, data, onClose }: CategoryFormProps) {
  const others = data.categories.filter((c) => c.id !== category?.id)
  const used = new Set(data.categories.map((c) => c.color))
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? PALETTE.find((c) => !used.has(c)) ?? PALETTE[0])
  const [deleting, setDeleting] = useState(false)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  const [error, setError] = useState<string>()

  const usage = category
    ? data.tasks.filter((t) => t.categoryId === category.id && !t.deleted).length +
      data.goals.filter((g) => g.categoryId === category.id).length +
      data.series.filter((s) => s.categoryId === category.id).length
    : 0

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError(t.settings.errName)
    if (others.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError(t.settings.errDuplicate)
    }
    await saveCategory({ id: category?.id, name: trimmed, color })
    onClose()
  }

  const remove = async () => {
    if (!category) return
    try {
      await deleteCategory(category.id, moveTo)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t.settings.errDelete)
    }
  }

  return (
    <div>
      <Field label={t.common.name}>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.settings.namePlaceholder}
          maxLength={30}
          enterKeyHint="done"
        />
      </Field>

      <Field label={t.settings.color}>
        <div className="grid grid-cols-6 gap-2.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t.settings.colorAria(c)}
              aria-pressed={c === color}
              onClick={() => setColor(c)}
              className="flex aspect-square items-center justify-center rounded-full"
              style={{ backgroundColor: c }}
            >
              {c === color && <span className="h-1/3 w-1/3 rounded-full bg-white shadow" />}
            </button>
          ))}
        </div>
      </Field>

      {error && <p className="pt-3 text-[14px] text-st-red">{error}</p>}

      <div className="flex flex-col gap-2 pt-5">
        <Button onClick={() => void save()}>{category ? t.common.save : t.settings.addCategory}</Button>

        {category && !deleting && (
          <Button variant="danger" disabled={others.length === 0} onClick={() => setDeleting(true)}>
            {others.length === 0 ? t.settings.cantDeleteOnly : t.settings.deleteCategory}
          </Button>
        )}

        {category && deleting && (
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="pb-2 text-[14px]">
              {usage > 0 ? t.settings.usage(usage) : t.settings.usageEmpty}
            </p>
            <select
              aria-label={t.settings.moveTo}
              className={inputClass}
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
            >
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 pt-3">
              <Button variant="plain" onClick={() => setDeleting(false)}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" onClick={() => void remove()}>
                {t.common.delete}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ThemeSection() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const themes: readonly { value: Theme; label: string }[] = [
    { value: 'system', label: t.settings.themeSystem },
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
  ]
  return (
    <>
      <SectionTitle>{t.settings.appearance}</SectionTitle>
      <div className="rounded-xl bg-surface p-3">
        <Segmented options={themes} value={theme} onChange={setTheme} />
      </div>
    </>
  )
}

function UnitsSection() {
  const lang = useUiStore((s) => s.lang)
  const currency = useCurrency(lang)
  const unitSystem = useUnitSystem()
  if (!currency || !unitSystem) return null
  const systems: readonly { value: UnitSystem; label: string }[] = [
    { value: 'metric', label: t.settings.unitsMetric },
    { value: 'imperial', label: t.settings.unitsImperial },
  ]
  const names = new Intl.DisplayNames(t.localeTag, { type: 'currency' })
  return (
    <>
      <SectionTitle>{t.settings.units}</SectionTitle>
      <div className="rounded-xl bg-surface p-3">
        <div className="pb-1.5 text-[13px] font-medium text-muted">{t.settings.currency}</div>
        <select
          aria-label={t.settings.currency}
          className={inputClass}
          value={currency}
          onChange={(e) => void setCurrency(e.target.value as Currency)}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code} — {names.of(code)}
            </option>
          ))}
        </select>
        <div className="pb-1.5 pt-3.5 text-[13px] font-medium text-muted">{t.settings.unitSystem}</div>
        <Segmented options={systems} value={unitSystem} onChange={(v) => void setUnitSystem(v)} />
      </div>
    </>
  )
}

function LanguageSection() {
  const setting = useUiStore((s) => s.langSetting)
  const setLangSetting = useUiStore((s) => s.setLangSetting)
  const options: readonly { value: LangSetting; label: string }[] = [
    { value: 'system', label: t.settings.languageAuto },
    { value: 'ru', label: LANG_NAMES.ru },
    { value: 'en', label: LANG_NAMES.en },
  ]
  return (
    <>
      <SectionTitle>{t.settings.language}</SectionTitle>
      <div className="rounded-xl bg-surface p-3">
        <select
          aria-label={t.settings.language}
          className={inputClass}
          value={setting}
          onChange={(e) => setLangSetting(e.target.value as LangSetting)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

function ModulesSection() {
  const enabled = useEnabledModules()
  if (!enabled) return null
  return (
    <>
      <SectionTitle>{t.modules.title}</SectionTitle>
      <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
        {/* Включённые идут первыми, в порядке плиток на главном экране */}
        {[...MODULES]
          .sort((a, b) => {
            const ia = enabled.indexOf(a.id)
            const ib = enabled.indexOf(b.id)
            return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib)
          })
          .map((m) => (
            <div key={m.id}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Toggle
                    checked={enabled.includes(m.id)}
                    onChange={(on) => void setModuleEnabled(m.id, on)}
                    label={m.title()}
                  />
                </div>
                {enabled.indexOf(m.id) > 0 && (
                  <button
                    type="button"
                    aria-label={t.modules.moveUp(m.title())}
                    onClick={() => void moveModule(m.id, -1)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-accent active:opacity-60"
                  >
                    <ArrowUpIcon />
                  </button>
                )}
              </div>
              <p className="px-1 pt-1 text-[13px] text-muted">{m.description()}</p>
            </div>
          ))}
        <p className="px-1 text-[13px] text-muted">{t.modules.settingsHint}</p>
      </div>
    </>
  )
}

function backupAgeText(days: number | undefined): string {
  if (days === undefined) return t.backup.never
  if (days === 0) return t.backup.today
  return t.backup.daysAgo(days)
}

function BackupSection() {
  const lastBackupAt = useLastBackupAt()
  const days = daysSinceBackup(lastBackupAt)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean }>()
  const [persisted, setPersisted] = useState<boolean>()

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const doExport = async () => {
    setMessage(undefined)
    try {
      const json = JSON.stringify(await exportBackup(), null, 2)
      const name = backupFileName()
      const file = new File([json], name, { type: 'application/json' })
      // На айфоне — системное окно «Поделиться» (сохранить в Файлы, отправить себе); иначе — скачивание.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          throw e
        }
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      await markBackupDone()
      setMessage({ text: t.backup.saved(name) })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t.backup.exportFailed, error: true })
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setMessage(undefined)
    try {
      setPending(parseBackup(await file.text()))
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t.backup.badFile, error: true })
    }
  }

  const doImport = async () => {
    if (!pending) return
    try {
      await importBackup(pending)
      setMessage({ text: t.backup.restored })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : t.backup.restoreFailed, error: true })
    }
    setPending(null)
  }

  const stale = days === undefined || days >= 7

  return (
    <>
      <SectionTitle>{t.backup.title}</SectionTitle>
      <div className="rounded-xl bg-surface p-3">
        <p className={`text-[15px] ${stale ? 'font-medium text-st-red' : ''}`}>{backupAgeText(days)}</p>
        <p className="pt-1 text-[13px] text-muted">{t.backup.info}</p>
        <div className="flex gap-2 pt-3">
          <Button onClick={() => void doExport()}>{t.backup.export}</Button>
          <Button variant="plain" onClick={() => fileInput.current?.click()}>
            {t.backup.import}
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {message && <p className={`pt-2.5 text-[14px] ${message.error ? 'text-st-red' : 'text-st-green'}`}>{message.text}</p>}
        {persisted !== undefined && (
          <p className="pt-2.5 text-[13px] text-muted">
            {persisted ? t.backup.persisted : t.backup.notPersisted}
          </p>
        )}
      </div>

      <BottomSheet open={!!pending} title={t.backup.restoreTitle} onClose={() => setPending(null)}>
        {pending && (
          <div>
            <p className="pt-1 text-[15px]">
              {t.backup.summary(
                pending.exportedAt ? new Date(pending.exportedAt).toLocaleDateString(t.localeTag) : undefined,
                pending.tasks.length,
                pending.goals.length,
                pending.categories.length,
              )}
            </p>
            <p className="pt-2 text-[15px] font-medium text-st-red">{t.backup.replaceWarning}</p>
            <div className="flex flex-col gap-2 pt-5">
              <Button variant="danger" onClick={() => void doImport()}>
                {t.backup.replace}
              </Button>
              <Button variant="plain" onClick={() => setPending(null)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}

export function SettingsScreen({ data }: { data: AppData | undefined }) {
  const closeSettings = useUiStore((s) => s.closeSettings)
  const [editing, setEditing] = useState<{ category?: Category } | null>(null)

  return (
    <div className="animate-fade-in px-safe fixed inset-0 z-40 flex flex-col bg-bg text-fg">
      <header className="pt-safe shrink-0">
        <div className="relative flex h-11 items-center justify-center">
          <button
            type="button"
            onClick={closeSettings}
            className="absolute left-0 flex h-11 items-center pl-1 pr-3 text-[17px] text-accent active:opacity-60"
          >
            <ChevronLeftIcon />
            {t.common.back}
          </button>
          <h1 className="text-[17px] font-semibold">{t.settings.title}</h1>
        </div>
      </header>

      {data && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <SectionTitle>{t.settings.categories}</SectionTitle>
          <div className="divide-y divide-line rounded-xl bg-surface">
            {data.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEditing({ category: c })}
                className="flex h-12 w-full items-center gap-3 pl-4 pr-2 text-left active:opacity-60"
              >
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="min-w-0 flex-1 truncate text-[16px]">{c.name}</span>
                <span className="text-muted/60">
                  <ChevronRightIcon />
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEditing({})}
              className="flex h-12 w-full items-center gap-2 pl-3 pr-2 text-left text-[16px] text-accent active:opacity-60"
            >
              <PlusIcon />
              {t.settings.addCategory}
            </button>
          </div>

          <ModulesSection />

          <ThemeSection />

          <LanguageSection />

          <UnitsSection />

          <BackupSection />

          <p className="pb-safe px-1 pt-5 text-center text-[12px] text-muted">{t.app.version(__APP_VERSION__)}</p>
          <div className="h-4" />

          <BottomSheet
            open={!!editing}
            title={editing?.category ? t.settings.categoryTitle : t.settings.newCategory}
            onClose={() => setEditing(null)}
          >
            {editing && (
              <CategoryForm
                key={editing.category?.id ?? 'new'}
                category={editing.category}
                data={data}
                onClose={() => setEditing(null)}
              />
            )}
          </BottomSheet>
        </div>
      )}
    </div>
  )
}
