// Генерирует иконки приложения и splash-экраны для iOS без внешних зависимостей
// и вписывает теги splash-экранов в index.html (между метками splash:start / splash:end).
// Запуск: npm run icons
import { deflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public')

// ───────────── PNG ─────────────

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** rgb — Uint8Array длиной width*height*3 */
function encodePng(width, height, rgb) {
  const stride = width * 3
  const raw = Buffer.alloc(height * (1 + stride))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0 // фильтр None
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), y * (1 + stride) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // бит на канал
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ───────────── Рисунок ─────────────

const TOP = [0x3b, 0x82, 0xf6]
const BOTTOM = [0x1d, 0x4e, 0xd8]
const WHITE = [0xff, 0xff, 0xff]

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t))
}

/** Цвет значка в точке (u, v) единичного квадрата: синий градиент, белое кольцо с галочкой */
function iconColor(u, v) {
  const bg = mix(TOP, BOTTOM, v)
  const ring = Math.abs(Math.hypot(u - 0.5, v - 0.5) - 0.27) < 0.032
  const check =
    Math.min(distToSegment(u, v, 0.385, 0.505, 0.468, 0.59), distToSegment(u, v, 0.468, 0.59, 0.625, 0.415)) < 0.034
  return ring || check ? WHITE : bg
}

const SS = 3 // сглаживание: 3×3 отсчёта на пиксель

/**
 * Рисует значок size×size в буфер по смещению (ox, oy).
 * radius > 0 — скруглённая плитка поверх фона bg (для splash-экрана).
 */
function drawIcon(rgb, width, ox, oy, size, radius = 0, bg = null) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          let color = iconColor(px / size, py / size)
          if (radius > 0) {
            const qx = Math.max(radius - px, px - (size - radius), 0)
            const qy = Math.max(radius - py, py - (size - radius), 0)
            if (Math.hypot(qx, qy) > radius) color = bg
          }
          acc[0] += color[0]
          acc[1] += color[1]
          acc[2] += color[2]
        }
      }
      const i = ((oy + y) * width + ox + x) * 3
      rgb[i] = Math.round(acc[0] / (SS * SS))
      rgb[i + 1] = Math.round(acc[1] / (SS * SS))
      rgb[i + 2] = Math.round(acc[2] / (SS * SS))
    }
  }
}

function icon(size) {
  const rgb = new Uint8Array(size * size * 3)
  drawIcon(rgb, size, 0, 0, size)
  return encodePng(size, size, rgb)
}

function splash(width, height, bg) {
  const rgb = new Uint8Array(width * height * 3)
  for (let i = 0; i < rgb.length; i += 3) rgb.set(bg, i)
  const size = Math.round(width * 0.26)
  drawIcon(rgb, width, Math.round((width - size) / 2), Math.round((height - size) / 2), size, size * 0.225, bg)
  return encodePng(width, height, rgb)
}

// ───────────── Файлы ─────────────

mkdirSync(join(outDir, 'splash'), { recursive: true })

for (const [name, size] of [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, name), icon(size))
  console.log(`public/${name} (${size}×${size})`)
}

// Экраны айфонов в точках и плотность пикселей; iOS берёт splash только при точном совпадении.
const SCREENS = [
  [440, 956, 3], // 16 Pro Max
  [402, 874, 3], // 16 Pro
  [430, 932, 3], // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // 12–14 Pro Max / Plus
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 12 mini, 13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [375, 667, 2], // SE 2 / 3, 8
]
const THEMES = [
  ['light', [0xf2, 0xf2, 0xf7]],
  ['dark', [0x00, 0x00, 0x00]],
]

const tags = []
for (const [w, h, ratio] of SCREENS) {
  for (const [theme, bg] of THEMES) {
    const name = `splash/${w * ratio}x${h * ratio}-${theme}.png`
    writeFileSync(join(outDir, name), splash(w * ratio, h * ratio, bg))
    console.log(`public/${name}`)
    tags.push(
      `    <link rel="apple-touch-startup-image" href="/${name}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: ${theme})" />`,
    )
  }
}

const htmlPath = join(root, 'index.html')
const html = readFileSync(htmlPath, 'utf-8')
const block = /(<!-- splash:start -->)[\s\S]*?(\n\s*<!-- splash:end -->)/
if (!block.test(html)) throw new Error('В index.html нет меток splash:start / splash:end')
writeFileSync(htmlPath, html.replace(block, `$1\n${tags.join('\n')}$2`))
console.log(`index.html: ${tags.length} тегов splash-экранов`)
