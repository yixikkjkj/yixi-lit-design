import { html, nothing } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

/**
 * 徽标组件，用于展示消息数量、状态点等标记。
 *
 * @slot - 被标记的内容（如按钮、图标），徽标定位在其右上角
 * @example
 * ```html
 * <ld-badge value="5"><ld-button>消息</ld-button></ld-badge>
 * <ld-badge :value="120" :max="99"><ld-icon name="mail-line"></ld-icon></ld-badge>
 * <ld-badge dot><ld-icon name="notification-line"></ld-icon></ld-badge>
 * <ld-badge value="99+" standalone></ld-badge>
 * ```
 */
export class LdBadge extends LdElement {
  /** 显示值（数字或字符串） */
  @property({ type: String }) value: string | number = ""
  /** 最大值，超过时显示 `${max}+` */
  @property({ type: Number }) max?: number
  /** 只显示小红点 */
  @property({ type: Boolean }) dot = false
  /** 是否隐藏徽标 */
  @property({ type: Boolean }) hidden = false
  /** 独立显示（无插槽内容时内联展示） */
  @property({ type: Boolean }) standalone = false

  private get displayValue(): string {
    if (
      typeof this.value === "number" &&
      this.max !== undefined &&
      this.value > this.max
    ) {
      return `${this.max}+`
    }
    return String(this.value)
  }

  render() {
    const badge = this.hidden
      ? nothing
      : this.dot
        ? html`<span class="ld-badge__dot"></span>`
        : this.value !== "" && this.value !== undefined
          ? html`<span class="ld-badge__content">${this.displayValue}</span>`
          : nothing
    const classes = ["ld-badge", this.standalone ? "ld-badge--standalone" : ""]
      .filter(Boolean)
      .join(" ")
    return html`
      <span class=${classes}>
        <slot></slot>
        ${badge}
      </span>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-badge": LdBadge
  }
}
