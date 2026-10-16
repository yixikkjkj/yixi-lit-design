import { html } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

export type DividerDirection = "horizontal" | "vertical"
export type DividerContentPosition = "left" | "center" | "right"

/**
 * 分割线组件，用于区隔内容区块。
 *
 * @slot - 分割线中间的文案（仅水平方向有效）
 *
 * @example
 * ```html
 * <ld-divider></ld-divider>
 * <ld-divider dashed content-position="left">分组标题</ld-divider>
 * <span>文本</span><ld-divider direction="vertical"></ld-divider><span>文本</span>
 * ```
 */
@customElement("ld-divider")
export class LdDivider extends LdElement {
  /** 方向 */
  @property({ type: String }) direction: DividerDirection = "horizontal"
  /** 是否虚线 */
  @property({ type: Boolean }) dashed = false
  /** 文案相对水平分割线的位置 */
  @property({ type: String, attribute: "content-position" })
  contentPosition: DividerContentPosition = "center"

  /** 默认插槽中是否存在文案 */
  @state() private hasText = false

  protected slottedContentChanged() {
    this.hasText = this.slotHasContent()
  }

  render() {
    const classes = [
      "ld-divider",
      `ld-divider--${this.direction}`,
      this.dashed ? "is-dashed" : "",
      this.direction === "horizontal" && this.hasText ? "has-text" : "",
      this.hasText ? `ld-divider--text-${this.contentPosition}` : "",
    ]
      .filter(Boolean)
      .join(" ")

    if (this.direction === "vertical") {
      return html`<div
        class=${classes}
        role="separator"
        aria-orientation="vertical"
      ></div>`
    }

    return html`
      <div class=${classes} role="separator" aria-orientation="horizontal">
        <span class="ld-divider__text" ?hidden=${!this.hasText}>
          <slot></slot>
        </span>
      </div>
    `
  }
}

define("ld-divider", LdDivider)

declare global {
  interface HTMLElementTagNameMap {
    "ld-divider": LdDivider
  }
}
