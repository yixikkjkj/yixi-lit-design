import { html, nothing } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

export type InputSize = "s" | "m" | "l"
export type InputStatus = "" | "error" | "warning"

/**
 * 输入框组件。
 *
 * @slot prefix - 输入框内前缀内容
 * @slot suffix - 输入框内后缀内容
 * @fires ld-input - 每次输入时触发，detail 为 { value }
 * @fires ld-change - 失焦或按下回车时触发，detail 为 { value }
 * @fires ld-clear - 点击清空按钮时触发
 *
 * @example
 * ```html
 * <ld-input placeholder="请输入" clearable maxlength="20"></ld-input>
 * <ld-input status="error"><span slot="prefix">￥</span></ld-input>
 * ```
 */
@customElement("ld-input")
export class LdInput extends LdElement {
  /** 绑定值 */
  @property({ type: String }) value = ""
  /** 占位文本 */
  @property({ type: String }) placeholder = ""
  /** 原生 type 属性 */
  @property({ type: String }) type = "text"
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 是否只读 */
  @property({ type: Boolean }) readonly = false
  /** 是否可清空 */
  @property({ type: Boolean }) clearable = false
  /** 最大输入长度，设置后右下角显示字数统计 */
  @property({ type: Number }) maxlength?: number
  /** 尺寸 */
  @property({ type: String }) size: InputSize = "m"
  /** 校验状态 */
  @property({ type: String }) status: InputStatus = ""

  /** 是否 hover（用于控制清空图标显示） */
  @state() private hovered = false

  protected get inputType(): string {
    return this.type
  }

  protected onInput(e: Event) {
    const input = e.target as HTMLInputElement
    this.value = input.value
    this.emit("ld-input", { value: this.value })
  }

  private onChange() {
    this.emit("ld-change", { value: this.value })
  }

  private onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.emit("ld-change", { value: this.value })
    }
  }

  protected onClear(e: Event) {
    e.stopPropagation()
    this.value = ""
    this.emit("ld-clear")
    this.emit("ld-input", { value: "" })
    this.emit("ld-change", { value: "" })
    const input = this.querySelector<HTMLInputElement>(".ld-input__inner")
    input?.focus()
  }

  protected get showClear(): boolean {
    return (
      this.clearable &&
      !this.disabled &&
      !this.readonly &&
      this.value.length > 0 &&
      this.hovered
    )
  }

  private onMouseenter() {
    this.hovered = true
  }

  private onMouseleave() {
    this.hovered = false
  }

  protected renderSuffix(): unknown {
    return nothing
  }

  render() {
    const classes = [
      "ld-input",
      this.size !== "m" ? `ld-input--${this.size}` : "",
      this.status ? `ld-input--${this.status}` : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    const showCount = typeof this.maxlength === "number" && this.maxlength >= 0
    return html`
      <div
        class=${classes}
        @mouseenter=${this.onMouseenter}
        @mouseleave=${this.onMouseleave}
      >
        <slot name="prefix"></slot>
        <input
          class="ld-input__inner"
          type=${this.inputType}
          .value=${this.value}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          maxlength=${this.maxlength ?? nothing}
          @input=${this.onInput}
          @change=${this.onChange}
          @keydown=${this.onKeydown}
        />
        ${
          this.showClear
            ? html`<ld-icon
              class="ld-input__clear"
              name="close-circle-fill"
              @click=${this.onClear}
            ></ld-icon>`
            : nothing
        }
        ${this.renderSuffix()}
        <slot name="suffix"></slot>
      </div>
      ${
        showCount
          ? html`<div class="ld-input__count">${this.value.length}/${this.maxlength}</div>`
          : nothing
      }
    `
  }
}

define("ld-input", LdInput)

declare global {
  interface HTMLElementTagNameMap {
    "ld-input": LdInput
  }
}
