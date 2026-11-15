// Вибро-отклик. На Android — navigator.vibrate; на iOS (Safari 17.4+) единственный способ —
// «нажать» на скрытый <input type="checkbox" switch>, система сама даёт лёгкий тактильный щелчок.
let switchLabel: HTMLLabelElement | null = null

function iosSwitch(): HTMLLabelElement {
  if (switchLabel) return switchLabel
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.id = 'haptic-switch'
  input.setAttribute('switch', '')
  const label = document.createElement('label')
  label.htmlFor = input.id
  label.setAttribute('aria-hidden', 'true')
  label.style.display = 'none'
  label.appendChild(input)
  document.body.appendChild(label)
  switchLabel = label
  return label
}

export function haptic(): void {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(10)
      return
    }
    iosSwitch().click()
  } catch {
    // отклик — украшение, его отсутствие не ошибка
  }
}
