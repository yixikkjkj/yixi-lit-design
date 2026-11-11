/**
 * 重新生成 src/components/icon/system.ts（系统内联图标）。
 *
 * 用法：node scripts/generate-system-icons.mjs [图标名...]
 * 不带参数时使用 ICONS 列表。图标取自 Remix Icon（经 Iconify API）。
 */
import { writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ICONS = [
  "close-line",
  "close-circle-fill",
  "check-line",
  "arrow-right-s-line",
  "arrow-left-s-line",
  "arrow-down-s-line",
  "arrow-up-line",
  "arrow-left-double-line",
  "arrow-right-double-line",
  "calendar-line",
  "checkbox-circle-fill",
  "error-warning-fill",
  "information-fill",
]

const names = process.argv.slice(2).length ? process.argv.slice(2) : ICONS

const entries = []
for (const name of names) {
  const res = await fetch(`https://api.iconify.design/ri/${name}.svg`)
  if (!res.ok) throw new Error(`${name}: ${res.status}`)
  const text = await res.text()
  const paths = [...text.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1])
  if (paths.length === 0) throw new Error(`${name}: no <path> found`)
  const items = paths.map((d) => `    "${d.replace(/"/g, '\\"')}"`).join(",\n")
  entries.push(`  "${name}": [\n${items},\n  ],`)
}

const output = `/**
 * 系统图标：库内部组件依赖的固定图标，以 SVG path 数据内联硬编码。
 * 零网络请求、零闪烁，且不随按需引入被裁剪。
 *
 * 图标来自 Remix Icon（https://remixicon.com），如需增补用
 * \`scripts/generate-system-icons.mjs\` 重新生成。
 */
export const systemIcons: Record<string, string[]> = {
${entries.join("\n")}
}
`

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/components/icon/system.ts",
)
await writeFile(target, output, "utf8")
console.log(`written: ${target} (${names.length} icons)`)
