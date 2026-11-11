import { systemIcons } from "./system.js"

/**
 * 解析完成的单个图标数据。
 * paths 为各 `<path>` 的 d 属性；Remix Icon 等主流图标集均为 path 构成。
 */
export interface IconSource {
  viewBox: string
  paths: string[]
}

/** 把图标名解析为 SVG 资源 URL（http(s)、data URI 均可）。 */
export type IconLibraryResolver = (name: string) => string

export interface IconLibrary {
  resolver: IconLibraryResolver
  /** 可选：拿到 SVG 元素后做二次加工（如统一 fill）。 */
  mutator?: (svg: SVGSVGElement) => void
}

const libraries = new Map<string, IconLibrary>()
const cache = new Map<string, Promise<IconSource>>()

const SYSTEM_VIEW_BOX = "0 0 24 24"

/**
 * 注册图标库。resolver 返回的 URL 仅在图标真正被使用时才请求，结果会被缓存。
 * 重复注册同名库会覆盖并清空该库的缓存。
 *
 * @example
 * ```ts
 * registerIconLibrary("self-hosted", {
 *   resolver: name => `/assets/icons/${name}.svg`,
 * })
 * ```
 */
export function registerIconLibrary(name: string, library: IconLibrary): void {
  libraries.set(name, library)
  clearCache(name)
}

/** 注销图标库并清空其缓存。 */
export function unregisterIconLibrary(name: string): void {
  libraries.delete(name)
  clearCache(name)
}

function clearCache(library: string): void {
  const prefix = `${library}:`
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

function loadFromUrl(
  url: string,
  mutator?: IconLibrary["mutator"],
): Promise<IconSource> {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Icon fetch failed: ${res.status} ${url}`)
      return res.text()
    })
    .then((text) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml")
      const svg = doc.querySelector("svg")
      if (!svg) throw new Error(`Invalid SVG response: ${url}`)
      mutator?.(svg)
      const paths = [...svg.querySelectorAll("path")]
        .map((p) => p.getAttribute("d") || "")
        .filter(Boolean)
      if (paths.length === 0) throw new Error(`SVG has no <path>: ${url}`)
      return {
        viewBox: svg.getAttribute("viewBox") || SYSTEM_VIEW_BOX,
        paths,
      }
    })
}

/**
 * 解析图标。
 *
 * - library 为空：先查系统内联图标，再回落到默认 `remix` 库
 * - library 为 "system"：只查系统内联图标
 * - 其他：走对应注册库
 *
 * 返回同步数据、Promise（需网络加载）或 null（无此图标）。
 */
export function getIconSource(
  library: string,
  name: string,
): IconSource | Promise<IconSource> | null {
  if (!name) return null
  if (library === "" || library === "system") {
    const paths = systemIcons[name]
    if (paths) {
      return { viewBox: SYSTEM_VIEW_BOX, paths }
    }
    if (library === "system") return null
    library = "remix"
  }
  const lib = libraries.get(library)
  if (!lib) return null
  const key = `${library}:${name}`
  let pending = cache.get(key)
  if (!pending) {
    pending = loadFromUrl(lib.resolver(name), lib.mutator)
    cache.set(key, pending)
  }
  return pending
}

/**
 * 默认图标库：Remix Icon（经 Iconify CDN 按需返回单个 SVG）。
 * 内网 / 离线场景请用 `registerIconLibrary("remix", ...)` 换成自托管地址。
 */
registerIconLibrary("remix", {
  resolver: (name) =>
    `https://api.iconify.design/ri/${encodeURIComponent(name)}.svg`,
  mutator: (svg) => {
    svg.setAttribute("fill", "currentColor")
  },
})
