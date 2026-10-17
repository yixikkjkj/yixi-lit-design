import { html, nothing } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type DropdownTrigger = "click" | "hover"
export type DropdownPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end"
export type DropdownItemVariant = "" | "error"

/**
 * 下拉菜单项，需配合 ld-dropdown 使用。
 *
 * @slot - 菜单项内容
 * @fires ld-select - 点击时触发（未禁用），detail 为 { value }
 *
 * @example
 * ```html
 * <ld-dropdown-item value="edit" icon="edit-line">编辑</ld-dropdown-item>
 * <ld-dropdown-item value="remove" variant="error" divider>删除</ld-dropdown-item>
 * ```
 */
export class LdDropdownItem extends LdElement {
  /** 菜单项的值 */
  @property({ type: String }) value = ""
  /** 左侧图标名（Remix Icon，不带 ri- 前缀） */
  @property({ type: String }) icon = ""
  /** 是否为危险项（红色文案） */
  @property({ type: String }) variant: DropdownItemVariant = ""
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 是否在下方显示分割线 */
  @property({ type: Boolean }) divider = false

  private onClick() {
    if (this.disabled) return
    this.emit("ld-select", { value: this.value })
  }

  render() {
    const classes = [
      "ld-dropdown__item",
      this.variant ? `ld-dropdown__item--${this.variant}` : "",
      this.divider ? "is-divider" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return html`
      <div
        class=${classes}
        role="menuitem"
        aria-disabled=${this.disabled ? "true" : "false"}
        @click=${this.onClick}
      >
        ${this.icon ? html`<ld-icon name=${this.icon}></ld-icon>` : nothing}
        <span class="ld-dropdown__label"><slot></slot></span>
      </div>
    `
  }
}

/**
 * 下拉菜单组件，点击或悬浮触发元素时弹出选项列表。
 *
 * @slot trigger - 触发元素
 * @slot - 若干 ld-dropdown-item
 * @fires ld-select - 选中菜单项时触发（事件由菜单项冒泡而来），detail 为 { value }
 *
 * @example
 * ```html
 * <ld-dropdown>
 *   <ld-button slot="trigger">更多操作</ld-button>
 *   <ld-dropdown-item value="edit">编辑</ld-dropdown-item>
 *   <ld-dropdown-item value="remove" variant="error">删除</ld-dropdown-item>
 * </ld-dropdown>
 * ```
 */
export class LdDropdown extends LdElement {
  /** 触发方式 */
  @property({ type: String }) trigger: DropdownTrigger = "click"
  /** 弹出位置 */
  @property({ type: String }) placement: DropdownPlacement = "bottom-start"
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false

  /** 面板是否展开 */
  @state() private open = false

  private closeTimer?: number

  disconnectedCallback() {
    super.disconnectedCallback()
    this.clearTimer()
    document.removeEventListener("click", this.onDocumentClick, true)
  }

  private clearTimer() {
    if (this.closeTimer !== undefined) {
      clearTimeout(this.closeTimer)
      this.closeTimer = undefined
    }
  }

  private setOpen(open: boolean) {
    if (this.open === open) return
    this.open = open
    if (open) {
      document.addEventListener("click", this.onDocumentClick, true)
    } else {
      document.removeEventListener("click", this.onDocumentClick, true)
    }
  }

  private onTriggerClick = () => {
    if (this.disabled || this.trigger !== "click") return
    this.setOpen(!this.open)
  }

  private onMouseEnter = () => {
    if (this.disabled || this.trigger !== "hover") return
    this.clearTimer()
    this.setOpen(true)
  }

  private onMouseLeave = () => {
    if (this.trigger !== "hover") return
    this.clearTimer()
    this.closeTimer = window.setTimeout(() => this.setOpen(false), 100)
  }

  private onDocumentClick = (e: Event) => {
    if (!this.contains(e.target as Node)) {
      this.setOpen(false)
    }
  }

  private onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.open) {
      this.setOpen(false)
    }
  }

  /** 选中菜单项后自动收起面板 */
  private onSelect = () => {
    this.setOpen(false)
  }

  render() {
    const classes = [
      "ld-dropdown",
      this.open ? "is-open" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return html`
      <span
        class=${classes}
        @mouseenter=${this.onMouseEnter}
        @mouseleave=${this.onMouseLeave}
        @keydown=${this.onKeydown}
      >
        <span class="ld-dropdown__trigger" @click=${this.onTriggerClick}>
          <slot name="trigger"></slot>
        </span>
        <div
          class="ld-dropdown__panel ld-dropdown__panel--${this.placement}"
          role="menu"
          @ld-select=${this.onSelect}
        >
          <slot></slot>
        </div>
      </span>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-dropdown": LdDropdown
    "ld-dropdown-item": LdDropdownItem
  }
}
