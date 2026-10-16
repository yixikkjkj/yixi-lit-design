import { html, nothing } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"
import type { InputSize } from "../input/index.js"

/**
 * 下拉选项组件，需配合 ld-select 使用。
 *
 * @slot - 选项显示文本（未设置 label 属性时生效）
 *
 * @example
 * ```html
 * <ld-option value="beijing" label="北京"></ld-option>
 * ```
 */
@customElement("ld-option")
export class LdOption extends LdElement {
  /** 选项值 */
  @property({ type: String }) value = ""
  /** 选项显示文本，未设置时取默认插槽文本 */
  @property({ type: String }) label = ""
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false

  /** 当前是否被选中（由 ld-select 同步） */
  @property({ type: Boolean, reflect: false }) selected = false

  /** 获取显示文本 */
  get displayLabel(): string {
    return this.label || (this.textContent ?? "").trim()
  }

  private onClick() {
    if (this.disabled) return
    this.emit("ld-option-select", { value: this.value })
  }

  render() {
    const classes = [
      "ld-option",
      this.selected ? "is-selected" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <div class=${classes} @click=${this.onClick}>
        <span class="ld-option__label">${this.label || html`<slot></slot>`}</span>
        ${this.selected ? html`<ld-icon name="check-line"></ld-icon>` : nothing}
      </div>
    `
  }
}

define("ld-option", LdOption)

/**
 * 下拉选择器组件。
 *
 * @slot - 若干 ld-option
 * @fires ld-change - 选中值变化时触发，detail 为 { value }
 *
 * @example
 * ```html
 * <ld-select placeholder="请选择城市" clearable>
 *   <ld-option value="beijing" label="北京"></ld-option>
 *   <ld-option value="shanghai" label="上海"></ld-option>
 * </ld-select>
 * ```
 */
@customElement("ld-select")
export class LdSelect extends LdElement {
  /** 当前选中的值 */
  @property({ type: String }) value = ""
  /** 占位文本 */
  @property({ type: String }) placeholder = "请选择"
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 是否可清空 */
  @property({ type: Boolean }) clearable = false
  /** 尺寸 */
  @property({ type: String }) size: InputSize = "m"

  /** 下拉面板是否展开 */
  @state() private open = false
  /** 是否 hover（用于控制清空图标显示） */
  @state() private hovered = false

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener("click", this.onDocumentClick)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener("click", this.onDocumentClick)
  }

  updated() {
    this.syncOptions()
  }

  private onDocumentClick = (e: Event) => {
    if (!this.open) return
    if (!e.composedPath().includes(this)) {
      this.open = false
    }
  }

  private getOptions(): LdOption[] {
    return Array.from(this.querySelectorAll<LdOption>("ld-option"))
  }

  private syncOptions() {
    for (const option of this.getOptions()) {
      option.selected = option.value === this.value && this.value !== ""
    }
  }

  private get selectedOption(): LdOption | undefined {
    return this.getOptions().find(
      (o) => o.value === this.value && this.value !== "",
    )
  }

  private toggleOpen() {
    if (this.disabled) return
    this.open = !this.open
  }

  private onOptionSelect(e: CustomEvent) {
    e.stopPropagation()
    const { value } = e.detail as { value: string }
    this.value = value
    this.open = false
    this.emit("ld-change", { value })
  }

  private onClear(e: Event) {
    e.stopPropagation()
    this.value = ""
    this.emit("ld-change", { value: "" })
  }

  render() {
    const selected = this.selectedOption
    const showClear =
      this.clearable && !this.disabled && !!selected && this.hovered
    const classes = [
      "ld-select",
      this.size !== "m" ? `ld-select--${this.size}` : "",
      this.open ? "is-open" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <div
        class=${classes}
        @mouseenter=${() => (this.hovered = true)}
        @mouseleave=${() => (this.hovered = false)}
        @ld-option-select=${this.onOptionSelect}
      >
        <div class="ld-select__trigger" @click=${this.toggleOpen}>
          <span class=${
            selected ? "ld-select__value" : "ld-select__placeholder"
          }>
            ${selected ? selected.displayLabel : this.placeholder}
          </span>
          ${
            showClear
              ? html`<ld-icon class="ld-select__clear" name="close-circle-fill" @click=${this.onClear}></ld-icon>`
              : html`<ld-icon class="ld-select__arrow" name="arrow-down-s-line"></ld-icon>`
          }
        </div>
        <div class="ld-select__panel">
          <slot></slot>
        </div>
      </div>
    `
  }
}

define("ld-select", LdSelect)

declare global {
  interface HTMLElementTagNameMap {
    "ld-option": LdOption
    "ld-select": LdSelect
  }
}
