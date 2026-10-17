import { html, nothing } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type LoadingSize = "s" | "m" | "l"

/**
 * 加载组件，支持包裹内容、独立图标与全屏遮罩三种用法。
 *
 * @slot - 被包裹的内容（渲染为相对定位容器 + 内部遮罩层）；无插槽内容时只显示旋转图标
 * @example
 * ```html
 * <ld-loading text="加载中..."><div>内容区域</div></ld-loading>
 * <ld-loading fullscreen text="加载中..."></ld-loading>
 * <ld-loading size="s"></ld-loading>
 * ```
 */
export class LdLoading extends LdElement {
  /** 加载文案 */
  @property({ type: String }) text = ""
  /** 尺寸 */
  @property({ type: String }) size: LoadingSize = "m"
  /** 全屏遮罩模式 */
  @property({ type: Boolean }) fullscreen = false

  @state() private hasContent = false

  protected slottedContentChanged() {
    this.hasContent = this.slotHasContent()
  }

  private renderSpinner() {
    const classes = [
      "ld-loading__spinner",
      this.size !== "m" ? `ld-loading__spinner--${this.size}` : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <span class=${classes} aria-hidden="true"></span>
      ${
        this.text
          ? html`<span class="ld-loading__text">${this.text}</span>`
          : nothing
      }
    `
  }

  render() {
    if (this.fullscreen) {
      return html`
        <div class="ld-loading__mask ld-loading__mask--fullscreen">
          <div class="ld-loading__indicator">${this.renderSpinner()}</div>
        </div>
      `
    }
    if (!this.hasContent) {
      return html`
        <span class="ld-loading ld-loading--bare">
          <slot></slot>
          <span class="ld-loading__indicator">${this.renderSpinner()}</span>
        </span>
      `
    }
    return html`
      <div class="ld-loading">
        <slot></slot>
        <div class="ld-loading__mask">
          <div class="ld-loading__indicator">${this.renderSpinner()}</div>
        </div>
      </div>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-loading": LdLoading
  }
}
