import { svg, nothing } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"
import {
  getIconSource,
  registerIconLibrary,
  unregisterIconLibrary,
  type IconLibrary,
  type IconLibraryResolver,
  type IconSource,
} from "./registry.js"

export type { IconLibrary, IconLibraryResolver, IconSource }
export { registerIconLibrary, unregisterIconLibrary }

/**
 * 图标组件，内联 SVG 渲染。
 *
 * 库内部依赖的系统图标（关闭、箭头、勾选等）已内联，零网络请求；
 * 其他图标默认按需从 Remix Icon（Iconify CDN）加载单个 SVG，可注册
 * 自定义图标库替换来源。
 *
 * @example
 * ```html
 * <ld-icon name="search-line"></ld-icon>
 * <ld-icon name="arrow-up-s-line" size="20" color="#4f6ef7"></ld-icon>
 * ```
 *
 * 可用图标名称参考 https://remixicon.com （去掉 `ri-` 前缀填写）。
 * 自托管图标：
 * ```ts
 * registerIconLibrary("remix", { resolver: name => `/icons/${name}.svg` })
 * ```
 */
export class LdIcon extends LdElement {
  /** 图标名称，对应 Remix Icon 图标名（无需 `ri-` 前缀） */
  @property({ type: String }) name = ""

  /** 图标尺寸（px 或任意 CSS 长度），默认继承字体大小 */
  @property({ type: String }) size = ""

  /** 图标颜色，默认继承文本颜色 */
  @property({ type: String }) color = ""

  /**
   * 图标库名。默认（空）先查系统内联图标，再回落到 `remix` 库；
   * `system` 只用内联图标；其他值对应 `registerIconLibrary` 注册的库。
   */
  @property({ type: String }) library = ""

  @state() private svgSource: IconSource | null = null

  private loadToken = 0
  private loadedKey = ""

  override willUpdate(): void {
    const key = `${this.library}|${this.name}`
    if (key !== this.loadedKey) {
      this.loadedKey = key
      void this.resolveIcon()
    }
  }

  private async resolveIcon(): Promise<void> {
    const token = ++this.loadToken
    const result = getIconSource(this.library, this.name)
    if (result === null) {
      this.svgSource = null
      return
    }
    if (result instanceof Promise) {
      this.svgSource = null
      try {
        const source = await result
        if (token === this.loadToken) this.svgSource = source
      } catch (error) {
        console.warn(`[ld-icon] "${this.name}" 加载失败`, error)
      }
    } else {
      this.svgSource = result
    }
  }

  override render() {
    const size = this.size
      ? /^\d+$/.test(this.size)
        ? `${this.size}px`
        : this.size
      : ""
    const style = [
      size ? `width:${size};height:${size}` : "",
      this.color ? `color:${this.color}` : "",
    ]
      .filter(Boolean)
      .join(";")
    const paths = this.svgSource?.paths
    return svg`<svg
      class="ld-icon__svg"
      viewBox=${this.svgSource?.viewBox || "0 0 24 24"}
      style=${style || nothing}
      aria-hidden="true"
      focusable="false"
    >
      ${paths
        ? paths.map((d) => svg`<path fill="currentColor" d=${d}></path>`)
        : nothing}
    </svg>`
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-icon": LdIcon
  }
}
