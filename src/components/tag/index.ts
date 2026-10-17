import { html, nothing } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type TagVariant = "" | "primary" | "success" | "warning" | "danger"
export type TagTheme = "light" | "dark" | "outline"
export type TagSize = "s" | "m" | "l"

/**
 * 标签组件，用于标记和分类。
 *
 * @slot - 标签内容
 * @fires ld-close - 点击关闭图标时触发（随后标签自动移除）
 *
 * @example
 * ```html
 * <ld-tag variant="primary">标签</ld-tag>
 * <ld-tag variant="success" theme="dark">成功</ld-tag>
 * <ld-tag variant="danger" closable>可关闭</ld-tag>
 * ```
 */
export class LdTag extends LdElement {
  /** 类型 */
  @property({ type: String }) variant: TagVariant = ""
  /** 主题 */
  @property({ type: String }) theme: TagTheme = "light"
  /** 尺寸 */
  @property({ type: String }) size: TagSize = "m"
  /** 是否可关闭 */
  @property({ type: Boolean }) closable = false

  private onClose(e: Event) {
    e.stopPropagation()
    this.emit("ld-close")
    this.remove()
  }

  render() {
    const classes = [
      "ld-tag",
      this.variant ? `ld-tag--${this.variant}` : "",
      `ld-tag--${this.theme}`,
      this.size !== "m" ? `ld-tag--${this.size}` : "",
      this.closable ? "is-closable" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <span class=${classes}>
        <slot></slot>
        ${
          this.closable
            ? html`<span class="ld-tag__close" @click=${this.onClose}><ld-icon name="close-line"></ld-icon></span>`
            : nothing
        }
      </span>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-tag": LdTag
  }
}
