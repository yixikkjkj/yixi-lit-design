import { html, nothing } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

export type DialogTheme = "" | "info" | "success" | "warning" | "danger"

const THEME_ICONS: Record<string, string> = {
  info: "information-fill",
  success: "checkbox-circle-fill",
  warning: "error-warning-fill",
  danger: "close-circle-fill",
}

/**
 * 对话框组件，居中弹出的模态浮层。
 *
 * @slot - 对话框正文
 * @slot footer - 底部操作区
 * @fires ld-open - 打开时触发
 * @fires ld-close - 关闭时触发（遮罩点击 / 关闭图标 / ESC）
 *
 * @example
 * ```html
 * <ld-dialog open title="删除确认" width="420px">
 *   删除后不可恢复，确定继续吗？
 *   <div slot="footer">
 *     <ld-button>取消</ld-button>
 *     <ld-button variant="primary">确定</ld-button>
 *   </div>
 * </ld-dialog>
 * ```
 */
@customElement("ld-dialog")
export class LdDialog extends LdElement {
  /** 是否打开 */
  @property({ type: Boolean }) open = false
  /** 标题 */
  @property({ type: String }) title = ""
  /** 标题前的语义图标 */
  @property({ type: String }) theme: DialogTheme = ""
  /** 对话框宽度（CSS 长度） */
  @property({ type: String }) width = "480px"
  /** 是否显示关闭图标 */
  @property({ type: Boolean, attribute: "show-close" }) showClose = true
  /** 是否显示遮罩 */
  @property({ type: Boolean }) mask = true
  /** 点击遮罩是否关闭 */
  @property({ type: Boolean, attribute: "mask-closable" }) maskClosable = true
  /** 是否允许 ESC 关闭 */
  @property({ type: Boolean, attribute: "close-on-esc" }) closeOnEsc = true

  private _prevBodyOverflow = ""

  @state() private hasFooter = false

  protected slottedContentChanged() {
    this.hasFooter = this.slotHasContent("footer")
  }

  updated(changed: Map<string, unknown>) {
    // 仅在 open 真正变化时响应（首次挂载不触发）
    if (changed.has("open") && changed.get("open") !== undefined) {
      if (this.open) {
        document.addEventListener("keydown", this.onKeydown)
        this._prevBodyOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        this.emit("ld-open")
      } else {
        document.removeEventListener("keydown", this.onKeydown)
        document.body.style.overflow = this._prevBodyOverflow
        this.emit("ld-close")
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener("keydown", this.onKeydown)
    if (this.open) {
      document.body.style.overflow = this._prevBodyOverflow
    }
  }

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.closeOnEsc) {
      this.requestClose()
    }
  }

  private onMaskClick() {
    if (this.maskClosable) {
      this.requestClose()
    }
  }

  private requestClose() {
    if (!this.open) return
    this.open = false
  }

  private get showHeader(): boolean {
    return !!this.title || !!this.theme || this.showClose
  }

  render() {
    const panelClasses = [
      "ld-dialog__panel",
      this.theme ? `ld-dialog__panel--${this.theme}` : "",
      this.open ? "is-open" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return html`
      <div class="ld-dialog">
        ${
          this.mask
            ? html`<div
              class="ld-dialog__mask ${this.open ? "is-open" : ""}"
              @click=${this.onMaskClick}
            ></div>`
            : nothing
        }
        <div
          class=${panelClasses}
          style="width:${this.width}"
          role="dialog"
          aria-modal="true"
          aria-hidden=${this.open ? "false" : "true"}
        >
          <div class="ld-dialog__header" ?hidden=${!this.showHeader}>
            ${
              this.theme
                ? html`<ld-icon
                  class="ld-dialog__icon"
                  name=${THEME_ICONS[this.theme] ?? THEME_ICONS.info}
                ></ld-icon>`
                : nothing
            }
            <span class="ld-dialog__title">${this.title}</span>
            ${
              this.showClose
                ? html`<span
                  class="ld-dialog__close"
                  role="button"
                  aria-label="关闭"
                  @click=${this.requestClose}
                >
                  <ld-icon name="close-line"></ld-icon>
                </span>`
                : nothing
            }
          </div>
          <div class="ld-dialog__body"><slot></slot></div>
          <div class="ld-dialog__footer" ?hidden=${!this.hasFooter}>
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `
  }
}

define("ld-dialog", LdDialog)

declare global {
  interface HTMLElementTagNameMap {
    "ld-dialog": LdDialog
  }
}
