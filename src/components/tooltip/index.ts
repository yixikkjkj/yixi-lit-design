import { html, nothing } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type TooltipPlacement = "top" | "bottom" | "left" | "right"
export type TooltipTrigger = "hover" | "click"

/**
 * 文字提示组件，hover 或 click 触发元素时显示气泡。
 *
 * @slot - 触发元素
 * @example
 * ```html
 * <ld-tooltip content="提示内容"><ld-button>hover 我</ld-button></ld-tooltip>
 * <ld-tooltip content="点击显示" trigger="click" placement="bottom"><ld-button>点我</ld-button></ld-tooltip>
 * ```
 */
export class LdTooltip extends LdElement {
  /** 提示文本 */
  @property({ type: String }) content = ""
  /** 出现位置 */
  @property({ type: String }) placement: TooltipPlacement = "top"
  /** 触发方式 */
  @property({ type: String }) trigger: TooltipTrigger = "hover"
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false

  @state() private visible = false

  private showTimer?: number

  disconnectedCallback() {
    super.disconnectedCallback()
    this.clearTimer()
    document.removeEventListener("click", this.onDocumentClick, true)
  }

  private clearTimer() {
    if (this.showTimer !== undefined) {
      clearTimeout(this.showTimer)
      this.showTimer = undefined
    }
  }

  private onMouseEnter = () => {
    if (this.disabled || this.trigger !== "hover") return
    this.clearTimer()
    this.showTimer = window.setTimeout(() => {
      this.visible = true
    }, 100)
  }

  private onMouseLeave = () => {
    if (this.trigger !== "hover") return
    this.clearTimer()
    this.visible = false
  }

  private onTriggerClick = () => {
    if (this.disabled || this.trigger !== "click") return
    this.visible = !this.visible
    if (this.visible) {
      document.addEventListener("click", this.onDocumentClick, true)
    } else {
      document.removeEventListener("click", this.onDocumentClick, true)
    }
  }

  private onDocumentClick = (e: Event) => {
    if (!this.contains(e.target as Node)) {
      this.visible = false
      document.removeEventListener("click", this.onDocumentClick, true)
    }
  }

  render() {
    const popperClass = [
      "ld-tooltip__popper",
      `ld-tooltip__popper--${this.placement}`,
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <span
        class="ld-tooltip"
        @mouseenter=${this.onMouseEnter}
        @mouseleave=${this.onMouseLeave}
        @click=${this.onTriggerClick}
      >
        <slot></slot>
        ${
          this.visible && !this.disabled && this.content
            ? html`<div class=${popperClass} role="tooltip">
              <span class="ld-tooltip__arrow"></span>
              <span class="ld-tooltip__content">${this.content}</span>
            </div>`
            : nothing
        }
      </span>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-tooltip": LdTooltip
  }
}
