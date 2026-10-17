import { html } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

/**
 * 图标组件，基于 Remix Icon 字体。
 *
 * @example
 * ```html
 * <ld-icon name="search-line"></ld-icon>
 * <ld-icon name="arrow-up-s-line" size="20" color="#4f6ef7"></ld-icon>
 * ```
 *
 * 可用图标名称参考 https://remixicon.com （去掉 `ri-` 前缀填写）。
 */
export class LdIcon extends LdElement {
  /** 图标名称，对应 Remix Icon 类名（无需 `ri-` 前缀） */
  @property({ type: String }) name = ""

  /** 图标尺寸（px 或任意 CSS 长度），默认继承字体大小 */
  @property({ type: String }) size = ""

  /** 图标颜色，默认继承文本颜色 */
  @property({ type: String }) color = ""

  render() {
    const style = [
      this.size
        ? `font-size:${this.size}${/^\d+$/.test(this.size) ? "px" : ""}`
        : "",
      this.color ? `color:${this.color}` : "",
    ]
      .filter(Boolean)
      .join(";")
    return html`<i class="ri-${this.name}" style=${style} aria-hidden="true"></i>`
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-icon": LdIcon
  }
}
