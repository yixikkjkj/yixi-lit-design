import { html, nothing } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type ButtonVariant = "primary" | "default" | "dashed" | "text"
export type ButtonSize = "s" | "m" | "l"
export type ButtonShape = "default" | "round"

/**
 * 按钮组件。
 *
 * @slot - 按钮内容
 * @fires ld-click - 点击时触发（禁用或加载状态下不触发）
 *
 * @example
 * ```html
 * <ld-button variant="primary">主要按钮</ld-button>
 * <ld-button variant="default" icon="search-line">搜索</ld-button>
 * <ld-button loading>提交中</ld-button>
 * ```
 */
export class LdButton extends LdElement {
  /** 按钮类型 */
  @property({ type: String }) variant: ButtonVariant = "default"
  /** 尺寸 */
  @property({ type: String }) size: ButtonSize = "m"
  /** 形状 */
  @property({ type: String }) shape: ButtonShape = "default"
  /** 左侧图标（Remix Icon 名称） */
  @property({ type: String }) icon = ""
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 是否加载中 */
  @property({ type: Boolean }) loading = false
  /** 是否撑满父容器 */
  @property({ type: Boolean }) block = false
  /** 原生 type 属性 */
  @property({ type: String }) type: "button" | "submit" | "reset" = "button"

  private onClick(e: Event) {
    if (this.disabled || this.loading) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    this.emit("ld-click")
  }

  render() {
    const classes = [
      "ld-btn",
      `ld-btn--${this.variant}`,
      this.size !== "m" ? `ld-btn--${this.size}` : "",
      this.shape !== "default" ? `ld-btn--${this.shape}` : "",
      this.block ? "ld-btn--block" : "",
      this.loading ? "is-loading" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <button
        class=${classes}
        type=${this.type}
        ?disabled=${this.disabled}
        @click=${this.onClick}
      >
        ${
          this.loading
            ? html`<span class="ld-btn__loading" aria-hidden="true"></span>`
            : nothing
        }
        ${
          this.icon && !this.loading
            ? html`<ld-icon name=${this.icon}></ld-icon>`
            : nothing
        }
        <slot></slot>
      </button>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-button": LdButton
  }
}
