import { html, nothing } from "lit"
import { customElement, property } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

export type LinkVariant = "" | "primary" | "success" | "warning" | "danger"
export type LinkUnderline = "hover" | "always" | "never"

/**
 * 文字链接组件。
 *
 * @slot - 链接文本
 * @fires ld-click - 点击时触发（禁用状态下不触发）
 *
 * @example
 * ```html
 * <ld-link href="https://example.com" target="_blank">默认链接</ld-link>
 * <ld-link variant="success" underline="always">成功链接</ld-link>
 * <ld-link icon="link" disabled>禁用链接</ld-link>
 * ```
 */
@customElement("ld-link")
export class LdLink extends LdElement {
  /** 链接地址 */
  @property({ type: String }) href = ""
  /** 原生 target 属性 */
  @property({ type: String }) target = ""
  /** 链接类型 */
  @property({ type: String }) variant: LinkVariant = ""
  /** 下划线显示时机 */
  @property({ type: String }) underline: LinkUnderline = "hover"
  /** 是否禁用（渲染为 span，不可点击） */
  @property({ type: Boolean }) disabled = false
  /** 左侧图标（Remix Icon 名称） */
  @property({ type: String }) icon = ""

  private onClick(e: Event) {
    if (this.disabled) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    this.emit("ld-click")
  }

  private renderInner() {
    return html`
      ${this.icon ? html`<ld-icon name=${this.icon}></ld-icon>` : nothing}
      <span class="ld-link__text"><slot></slot></span>
    `
  }

  render() {
    const classes = [
      "ld-link",
      this.variant ? `ld-link--${this.variant}` : "",
      `ld-link--underline-${this.underline}`,
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    if (this.disabled) {
      return html`<span class=${classes}>${this.renderInner()}</span>`
    }
    return html`
      <a
        class=${classes}
        href=${this.href || nothing}
        target=${this.target || nothing}
        @click=${this.onClick}
      >
        ${this.renderInner()}
      </a>
    `
  }
}

define("ld-link", LdLink)

declare global {
  interface HTMLElementTagNameMap {
    "ld-link": LdLink
  }
}
