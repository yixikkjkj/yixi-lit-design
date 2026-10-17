import { html, nothing } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type DrawerPlacement = "left" | "right"

/**
 * 抽屉组件，从屏幕边缘滑出的浮层。
 *
 * @slot - 抽屉内容
 * @slot footer - 底部操作区
 * @fires ld-open - 打开时触发
 * @fires ld-close - 关闭时触发（遮罩点击 / 关闭图标 / ESC）
 *
 * @example
 * ```html
 * <ld-drawer open title="标题" @ld-close=${...}>
 *   内容
 *   <div slot="footer"><ld-button variant="primary">确定</ld-button></div>
 * </ld-drawer>
 * ```
 */
export class LdDrawer extends LdElement {
  /** 是否打开 */
  @property({ type: Boolean }) open = false
  /** 标题 */
  @property({ type: String }) title = ""
  /** 滑出方向 */
  @property({ type: String }) placement: DrawerPlacement = "right"
  /** 抽屉宽度（CSS 长度） */
  @property({ type: String }) size = "320px"
  /** 是否显示遮罩 */
  @property({ type: Boolean }) mask = true
  /** 点击遮罩是否关闭 */
  @property({ type: Boolean, attribute: "mask-closable" }) maskClosable = true

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
    if (e.key === "Escape") {
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

  render() {
    const panelClasses = [
      "ld-drawer__panel",
      `ld-drawer__panel--${this.placement}`,
      this.open ? "is-open" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <div class="ld-drawer">
        ${
          this.mask
            ? html`<div
              class="ld-drawer__mask ${this.open ? "is-open" : ""}"
              @click=${this.onMaskClick}
            ></div>`
            : nothing
        }
        <div class=${panelClasses} style="width:${this.size}" role="dialog" aria-hidden=${
          this.open ? "false" : "true"
        }>
          <div class="ld-drawer__header">
            <span class="ld-drawer__title">${this.title}</span>
            <span class="ld-drawer__close" @click=${this.requestClose}>
              <ld-icon name="close-line"></ld-icon>
            </span>
          </div>
          <div class="ld-drawer__body"><slot></slot></div>
          <div class="ld-drawer__footer ${this.hasFooter ? "" : "is-empty"}">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-drawer": LdDrawer
  }
}
