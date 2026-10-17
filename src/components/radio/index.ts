import { html } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

/**
 * 单选框组件。
 *
 * @slot - 标签文本
 * @fires ld-change - 选中状态变化时触发，detail 为 { checked }
 *
 * @example
 * ```html
 * <ld-radio value="a">选项 A</ld-radio>
 * ```
 */
export class LdRadio extends LdElement {
  /** 是否选中 */
  @property({ type: Boolean }) checked = false
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 选项值（在 ld-radio-group 中用于匹配选中项） */
  @property({ type: String }) value = ""

  private onClick(e: Event) {
    e.preventDefault()
    if (this.disabled || this.checked) return
    this.checked = true
    this.emit("ld-change", { checked: true })
  }

  render() {
    const classes = [
      "ld-radio",
      this.checked ? "is-checked" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <label class=${classes} @click=${this.onClick}>
        <span class="ld-radio__circle">
          <span class="ld-radio__dot"></span>
        </span>
        <span class="ld-radio__label"><slot></slot></span>
      </label>
    `
  }
}


/**
 * 单选框组，管理一组 ld-radio 的选中值。
 *
 * @slot - 若干 ld-radio
 * @fires ld-change - 选中值变化时触发，detail 为 { value }
 *
 * @example
 * ```html
 * <ld-radio-group value="a">
 *   <ld-radio value="a">选项 A</ld-radio>
 *   <ld-radio value="b">选项 B</ld-radio>
 * </ld-radio-group>
 * ```
 */
export class LdRadioGroup extends LdElement {
  /** 当前选中的值 */
  @property({ type: String }) value = ""

  /** 是否整组禁用 */
  @property({ type: Boolean }) disabled = false

  connectedCallback() {
    super.connectedCallback()
    this.addEventListener("ld-change", this.onChildChange as EventListener)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener("ld-change", this.onChildChange as EventListener)
  }

  updated() {
    this.syncChildren()
  }

  private getRadios(): LdRadio[] {
    return Array.from(this.querySelectorAll<LdRadio>("ld-radio"))
  }

  private syncChildren() {
    for (const radio of this.getRadios()) {
      radio.checked = radio.value === this.value && this.value !== ""
      if (this.disabled) radio.disabled = true
    }
  }

  private onChildChange = (e: CustomEvent) => {
    const target = e.target as LdRadio
    if (!(target instanceof LdRadio)) return
    e.stopPropagation()
    this.value = target.value
    this.syncChildren()
    this.emit("ld-change", { value: this.value })
  }

  render() {
    return html`<div class="ld-radio-group"><slot></slot></div>`
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-radio": LdRadio
    "ld-radio-group": LdRadioGroup
  }
}
