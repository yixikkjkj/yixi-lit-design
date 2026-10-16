import { html } from "lit"
import { customElement, state } from "lit/decorators.js"
import { define } from "../../base.js"
import { LdInput } from "../input/index.js"

/**
 * 密码输入框组件，带可见性切换。
 *
 * @slot prefix - 输入框内前缀内容
 * @slot suffix - 输入框内后缀内容（可见性切换图标之前）
 * @fires ld-input - 每次输入时触发，detail 为 { value }
 * @fires ld-change - 失焦或按下回车时触发，detail 为 { value }
 *
 * @example
 * ```html
 * <ld-password-input placeholder="请输入密码"></ld-password-input>
 * ```
 */
@customElement("ld-password-input")
export class LdPasswordInput extends LdInput {
  /** 密码是否可见 */
  @state() private visible = false

  protected get inputType(): string {
    return this.visible ? "text" : "password"
  }

  private toggleVisible() {
    if (this.disabled) return
    this.visible = !this.visible
  }

  protected renderSuffix() {
    return html`
      <ld-icon
        class="ld-input__password-toggle"
        name=${this.visible ? "eye-line" : "eye-off-line"}
        @click=${this.toggleVisible}
      ></ld-icon>
    `
  }
}

define("ld-password-input", LdPasswordInput)

declare global {
  interface HTMLElementTagNameMap {
    "ld-password-input": LdPasswordInput
  }
}
