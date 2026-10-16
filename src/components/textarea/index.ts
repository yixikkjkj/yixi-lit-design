import { html, nothing } from "lit"
import { customElement, property, query } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

export type TextareaStatus = "" | "error" | "warning"
export type TextareaResize = "none" | "vertical" | "horizontal" | "both"

/**
 * 多行文本输入框。
 *
 * @fires ld-input - 每次输入时触发，detail 为 { value }
 * @fires ld-change - 失焦时触发，detail 为 { value }
 *
 * @example
 * ```html
 * <ld-textarea placeholder="请输入备注" maxlength="200"></ld-textarea>
 * <ld-textarea autosize rows="2" value="高度随内容自适应"></ld-textarea>
 * ```
 */
@customElement("ld-textarea")
export class LdTextarea extends LdElement {
  /** 绑定值 */
  @property({ type: String }) value = ""
  /** 占位文本 */
  @property({ type: String }) placeholder = ""
  /** 默认显示的行数 */
  @property({ type: Number }) rows = 3
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 是否只读 */
  @property({ type: Boolean }) readonly = false
  /** 最大输入长度，设置后右下角显示字数统计 */
  @property({ type: Number }) maxlength?: number
  /** 高度是否随内容自适应 */
  @property({ type: Boolean }) autosize = false
  /** 校验状态 */
  @property({ type: String }) status: TextareaStatus = ""
  /** 拖拽调整尺寸的方向 */
  @property({ type: String }) resize: TextareaResize = "vertical"
  /** 辅助提示文案 */
  @property({ type: String }) tips = ""

  @query(".ld-textarea__inner") private inner?: HTMLTextAreaElement

  updated(changed: Map<string, unknown>) {
    if (
      this.inner &&
      (changed.has("value") || changed.has("autosize")) &&
      this.autosize
    ) {
      this.applyAutosize()
    }
  }

  private applyAutosize() {
    const inner = this.inner
    if (!inner) return
    inner.style.height = "auto"
    inner.style.height = `${inner.scrollHeight}px`
  }

  private onInput(e: Event) {
    const inner = e.target as HTMLTextAreaElement
    this.value = inner.value
    if (this.autosize) this.applyAutosize()
    this.emit("ld-input", { value: this.value })
  }

  private onChange() {
    this.emit("ld-change", { value: this.value })
  }

  render() {
    const classes = [
      "ld-textarea",
      this.status ? `ld-textarea--${this.status}` : "",
      this.disabled ? "is-disabled" : "",
      this.autosize ? "is-autosize" : "",
    ]
      .filter(Boolean)
      .join(" ")

    const showFooter = !!this.tips || typeof this.maxlength === "number"

    return html`
      <div class=${classes}>
        <div class="ld-textarea__box">
          <textarea
            class="ld-textarea__inner"
            .value=${this.value}
            placeholder=${this.placeholder}
            rows=${this.rows}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            maxlength=${this.maxlength ?? nothing}
            style="resize:${this.autosize ? "none" : this.resize}"
            @input=${this.onInput}
            @change=${this.onChange}
          ></textarea>
        </div>
        <div class="ld-textarea__footer" ?hidden=${!showFooter}>
          <span class="ld-textarea__tips">${this.tips}</span>
          <span class="ld-textarea__count">
            ${
              typeof this.maxlength === "number"
                ? `${this.value.length}/${this.maxlength}`
                : ""
            }
          </span>
        </div>
      </div>
    `
  }
}

define("ld-textarea", LdTextarea)

declare global {
  interface HTMLElementTagNameMap {
    "ld-textarea": LdTextarea
  }
}
