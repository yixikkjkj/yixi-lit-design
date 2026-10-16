import { html, nothing } from "lit"
import { customElement, property } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

export type SwitchSize = "s" | "m"

/**
 * 开关组件。
 *
 * @fires ld-change - 状态切换时触发，detail 为 { checked }
 *
 * @example
 * ```html
 * <ld-switch checked></ld-switch>
 * <ld-switch size="s" loading></ld-switch>
 * ```
 */
@customElement("ld-switch")
export class LdSwitch extends LdElement {
  /** 是否开启 */
  @property({ type: Boolean }) checked = false
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 是否加载中（加载中不可切换） */
  @property({ type: Boolean }) loading = false
  /** 尺寸 */
  @property({ type: String }) size: SwitchSize = "m"

  private onClick() {
    if (this.disabled || this.loading) return
    this.checked = !this.checked
    this.emit("ld-change", { checked: this.checked })
  }

  render() {
    const classes = [
      "ld-switch",
      this.size !== "m" ? `ld-switch--${this.size}` : "",
      this.checked ? "is-checked" : "",
      this.disabled ? "is-disabled" : "",
      this.loading ? "is-loading" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <button
        class=${classes}
        type="button"
        role="switch"
        aria-checked=${this.checked ? "true" : "false"}
        ?disabled=${this.disabled}
        @click=${this.onClick}
      >
        <span class="ld-switch__dot">
          ${
            this.loading
              ? html`<span class="ld-switch__spinner" aria-hidden="true"></span>`
              : nothing
          }
        </span>
      </button>
    `
  }
}

define("ld-switch", LdSwitch)

declare global {
  interface HTMLElementTagNameMap {
    "ld-switch": LdSwitch
  }
}
