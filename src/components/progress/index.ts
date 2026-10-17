import { html, nothing } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type ProgressStatus = "" | "success" | "warning" | "danger"

/**
 * 进度条组件（线条型）。
 *
 * @example
 * ```html
 * <ld-progress percentage="50"></ld-progress>
 * <ld-progress percentage="80" status="success"></ld-progress>
 * <ld-progress percentage="60" text-inside stroke-width="16"></ld-progress>
 * ```
 */
export class LdProgress extends LdElement {
  /** 百分比（0-100） */
  @property({ type: Number }) percentage = 0
  /** 状态 */
  @property({ type: String }) status: ProgressStatus = ""
  /** 线条宽度（px） */
  @property({ type: Number, attribute: "stroke-width" }) strokeWidth = 6
  /** 是否显示文字 */
  @property({ type: Boolean, attribute: "show-text" }) showText = true
  /** 文字显示在进度条内部 */
  @property({ type: Boolean, attribute: "text-inside" }) textInside = false

  private get clamped(): number {
    return Math.min(100, Math.max(0, this.percentage))
  }

  private get barClass(): string {
    return [
      "ld-progress__bar",
      this.status ? `ld-progress__bar--${this.status}` : "",
    ]
      .filter(Boolean)
      .join(" ")
  }

  private renderText() {
    if (!this.showText) return nothing
    if (this.status === "success") {
      return html`<span class="ld-progress__text ld-progress__text--success"><ld-icon name="check-line"></ld-icon></span>`
    }
    if (this.status === "danger") {
      return html`<span class="ld-progress__text ld-progress__text--danger"><ld-icon name="close-line"></ld-icon></span>`
    }
    return html`<span class="ld-progress__text">${this.clamped}%</span>`
  }

  render() {
    const height = `${this.strokeWidth}px`
    const barStyle = `width:${this.clamped}%;height:${height}`
    return html`
      <div class="ld-progress">
        <div class="ld-progress__track" style="height:${height}">
          <div class=${this.barClass} style=${barStyle}>
            ${
              this.textInside && this.showText
                ? html`<span class="ld-progress__inner-text">${this.clamped}%</span>`
                : nothing
            }
          </div>
        </div>
        ${this.textInside ? nothing : this.renderText()}
      </div>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-progress": LdProgress
  }
}
