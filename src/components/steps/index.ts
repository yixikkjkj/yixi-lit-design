import { html } from "lit"
import { customElement, property } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

export type StepsDirection = "horizontal" | "vertical"
export type StepStatus = "wait" | "process" | "finish" | "error"

/**
 * 单个步骤，需配合 ld-steps 使用。
 *
 * @slot - 未设置 description 时的描述内容
 *
 * @example
 * ```html
 * <ld-steps current="1">
 *   <ld-step title="填写信息" description="10 分钟"></ld-step>
 *   <ld-step title="确认订单"></ld-step>
 * </ld-steps>
 * ```
 */
@customElement("ld-step")
export class LdStep extends LdElement {
  /** 标题 */
  @property({ type: String }) title = ""
  /** 描述文案 */
  @property({ type: String }) description = ""
  /** 自定义图标名（Remix Icon，不带 ri- 前缀） */
  @property({ type: String }) icon = ""
  /** 手动指定状态，缺省时由 ld-steps 的 current 推导 */
  @property({ type: String }) status: StepStatus | "" = ""
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false

  /** 在 ld-steps 中的序号（由父级写入） */
  @property({ type: Number, attribute: false }) index = 0
  /** 由 ld-steps 推导出的状态 */
  @property({ type: String, attribute: false }) computedStatus: StepStatus =
    "wait"

  private get currentStatus(): StepStatus {
    return this.status || this.computedStatus
  }

  render() {
    const status = this.currentStatus
    const headClasses = [
      "ld-steps__head",
      `is-${status}`,
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return html`
      <div class=${headClasses}>
        <span class="ld-steps__dot">${this.renderDot(status)}</span>
        <span class="ld-steps__title">${this.title}</span>
        <span class="ld-steps__line" aria-hidden="true"></span>
      </div>
      <div class="ld-steps__description" ?hidden=${!this.description}>
        ${this.description || html`<slot></slot>`}
      </div>
    `
  }

  private renderDot(status: StepStatus) {
    if (status === "finish") {
      return html`<ld-icon name="checkbox-circle-fill"></ld-icon>`
    }
    if (status === "error") {
      return html`<ld-icon name="close-circle-fill"></ld-icon>`
    }
    if (this.icon) {
      return html`<ld-icon name=${this.icon}></ld-icon>`
    }
    return html`${this.index + 1}`
  }
}

/**
 * 步骤条组件，展示流程的进度与顺序。
 *
 * @slot - 若干 ld-step
 * @fires ld-change - 当前步骤变化时触发，detail 为 { current }
 *
 * @example
 * ```html
 * <ld-steps current="1">
 *   <ld-step title="提交申请" description="已提交"></ld-step>
 *   <ld-step title="资质审核" description="进行中"></ld-step>
 *   <ld-step title="完成入驻"></ld-step>
 * </ld-steps>
 * ```
 */
@customElement("ld-steps")
export class LdSteps extends LdElement {
  /** 当前步骤序号，从 0 开始 */
  @property({ type: Number }) current = 0
  /** 排列方向 */
  @property({ type: String }) direction: StepsDirection = "horizontal"

  updated() {
    this.syncSteps()
  }

  private syncSteps() {
    const steps = Array.from(this.querySelectorAll<LdStep>("ld-step"))
    steps.forEach((step, index) => {
      step.index = index
      step.computedStatus = LdSteps.resolveStatus(index, this.current)
    })
  }

  /** 根据序号与当前步骤推导状态 */
  static resolveStatus(index: number, current: number): StepStatus {
    if (index < current) return "finish"
    if (index === current) return "process"
    return "wait"
  }

  render() {
    return html`
      <div class="ld-steps ld-steps--${this.direction}">
        <slot></slot>
      </div>
    `
  }
}

define("ld-step", LdStep)
define("ld-steps", LdSteps)

declare global {
  interface HTMLElementTagNameMap {
    "ld-step": LdStep
    "ld-steps": LdSteps
  }
}
