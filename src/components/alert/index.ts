import { html, nothing } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type AlertTheme = "info" | "success" | "warning" | "danger"

const THEME_ICONS: Record<AlertTheme, string> = {
  info: "information-fill",
  success: "checkbox-circle-fill",
  warning: "error-warning-fill",
  danger: "close-circle-fill",
}

/**
 * 警告提示组件，用于页面中常驻展示的信息反馈。
 *
 * @slot - 补充描述内容
 * @slot operation - 标题右侧的操作链接
 * @fires ld-close - 点击关闭按钮时触发
 *
 * @example
 * ```html
 * <ld-alert theme="success" title="提交成功"></ld-alert>
 * <ld-alert theme="warning" title="库存不足" closable>
 *   仅剩 3 件，请尽快下单。
 * </ld-alert>
 * ```
 */
export class LdAlert extends LdElement {
  /** 主题 */
  @property({ type: String }) theme: AlertTheme = "info"
  /** 标题文案 */
  @property({ type: String }) title = ""
  /** 是否显示前置图标 */
  @property({ type: Boolean, attribute: "show-icon" }) showIcon = true
  /** 是否显示关闭按钮 */
  @property({ type: Boolean }) closable = false

  /** 是否已关闭（关闭后整条隐藏） */
  @state() private closed = false
  /** 默认插槽是否注入了描述内容 */
  @state() private hasDescription = false

  protected slottedContentChanged() {
    this.hasDescription = this.slotHasContent()
  }

  private onClose() {
    this.closed = true
    this.emit("ld-close")
  }

  render() {
    if (this.closed) return nothing

    const classes = ["ld-alert", `ld-alert--${this.theme}`].join(" ")

    return html`
      <div class=${classes} role="alert">
        <div class="ld-alert__header">
          ${
            this.showIcon
              ? html`<ld-icon
                class="ld-alert__icon"
                name=${THEME_ICONS[this.theme] ?? THEME_ICONS.info}
              ></ld-icon>`
              : nothing
          }
          <div class="ld-alert__content">
            <span class="ld-alert__title">${this.title}</span>
            <slot name="operation"></slot>
          </div>
          ${
            this.closable
              ? html`<span
                class="ld-alert__close"
                role="button"
                aria-label="关闭"
                @click=${this.onClose}
              >
                <ld-icon name="close-line"></ld-icon>
              </span>`
              : nothing
          }
        </div>
        <div class="ld-alert__description" ?hidden=${!this.hasDescription}>
          <slot></slot>
        </div>
      </div>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-alert": LdAlert
  }
}
