import { html, nothing } from "lit"
import { customElement, property } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

/**
 * 复选框组件。
 *
 * @slot - 标签文本
 * @fires ld-change - 勾选状态变化时触发，detail 为 { checked }
 *
 * @example
 * ```html
 * <ld-checkbox value="a">选项 A</ld-checkbox>
 * <ld-checkbox indeterminate>半选状态</ld-checkbox>
 * ```
 */
@customElement("ld-checkbox")
export class LdCheckbox extends LdElement {
  /** 是否勾选 */
  @property({ type: Boolean }) checked = false
  /** 是否半选状态 */
  @property({ type: Boolean }) indeterminate = false
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 选项值（在 ld-checkbox-group 中用于汇总） */
  @property({ type: String }) value = ""

  private onClick(e: Event) {
    e.preventDefault()
    if (this.disabled) return
    this.checked = !this.checked
    if (this.checked) this.indeterminate = false
    this.emit("ld-change", { checked: this.checked })
  }

  render() {
    const classes = [
      "ld-checkbox",
      this.checked ? "is-checked" : "",
      this.indeterminate ? "is-indeterminate" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <label class=${classes} @click=${this.onClick}>
        <span class="ld-checkbox__box">
          ${
            this.checked && !this.indeterminate
              ? html`<ld-icon name="check-line"></ld-icon>`
              : nothing
          }
          ${
            this.indeterminate
              ? html`<span class="ld-checkbox__dash"></span>`
              : nothing
          }
        </span>
        <span class="ld-checkbox__label"><slot></slot></span>
      </label>
    `
  }
}

define("ld-checkbox", LdCheckbox)

/**
 * 复选框组，管理一组 ld-checkbox 的勾选值。
 *
 * @slot - 若干 ld-checkbox
 * @fires ld-change - 勾选值变化时触发，detail 为 { value: string[] }
 *
 * @example
 * ```html
 * <ld-checkbox-group value="a,b">
 *   <ld-checkbox value="a">选项 A</ld-checkbox>
 *   <ld-checkbox value="b">选项 B</ld-checkbox>
 * </ld-checkbox-group>
 * ```
 */
@customElement("ld-checkbox-group")
export class LdCheckboxGroup extends LdElement {
  /** 勾选的值数组（属性形式接收逗号分隔字符串） */
  @property({
    converter: {
      fromAttribute: (value: string | null) =>
        value ? value.split(",").filter(Boolean) : [],
      toAttribute: (value: string[]) => value.join(","),
    },
  })
  value: string[] = []

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

  private getCheckboxes(): LdCheckbox[] {
    return Array.from(this.querySelectorAll<LdCheckbox>("ld-checkbox"))
  }

  private syncChildren() {
    for (const checkbox of this.getCheckboxes()) {
      checkbox.checked = this.value.includes(checkbox.value)
      if (this.disabled) checkbox.disabled = true
    }
  }

  private onChildChange = (e: CustomEvent) => {
    const target = e.target as LdCheckbox
    if (!(target instanceof LdCheckbox)) return
    e.stopPropagation()
    const set = new Set(this.value)
    if (target.checked) {
      set.add(target.value)
    } else {
      set.delete(target.value)
    }
    this.value = Array.from(set)
    this.emit("ld-change", { value: this.value })
  }

  render() {
    return html`<div class="ld-checkbox-group"><slot></slot></div>`
  }
}

define("ld-checkbox-group", LdCheckboxGroup)

declare global {
  interface HTMLElementTagNameMap {
    "ld-checkbox": LdCheckbox
    "ld-checkbox-group": LdCheckboxGroup
  }
}
