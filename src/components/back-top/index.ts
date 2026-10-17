import { html } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

/**
 * 回到顶部组件：滚动超过一定高度后出现，点击平滑滚动回顶部。
 *
 * @fires ld-click - 点击按钮时触发
 *
 * @example
 * ```html
 * <ld-back-top></ld-back-top>
 * <ld-back-top visibility-height="400" right="60px" bottom="80px"></ld-back-top>
 * <ld-back-top target=".scroll-container"></ld-back-top>
 * ```
 */
export class LdBackTop extends LdElement {
  /** 滚动超过该高度（px）后显示按钮 */
  @property({ type: Number, attribute: "visibility-height" }) visibilityHeight =
    200
  /** 距离视口右侧的距离 */
  @property({ type: String }) right = "40px"
  /** 距离视口底部的距离 */
  @property({ type: String }) bottom = "40px"
  /** 滚动容器选择器，缺省为 window */
  @property({ type: String }) target = ""

  @state() private visible = false

  private scrollTarget: HTMLElement | Window = window

  firstUpdated() {
    this.bindScrollTarget()
  }

  disconnectedCallback() {
    this.unbindScrollTarget()
    super.disconnectedCallback()
  }

  private bindScrollTarget() {
    this.unbindScrollTarget()
    let el: HTMLElement | null = null
    if (this.target) {
      try {
        el = document.querySelector<HTMLElement>(this.target)
      } catch {
        el = null
      }
    }
    this.scrollTarget = el ?? window
    this.scrollTarget.addEventListener("scroll", this.onScroll, {
      passive: true,
    })
    this.onScroll()
  }

  private unbindScrollTarget() {
    this.scrollTarget.removeEventListener("scroll", this.onScroll)
  }

  private onScroll = () => {
    const top =
      this.scrollTarget === window
        ? window.scrollY
        : (this.scrollTarget as HTMLElement).scrollTop
    this.visible = top >= this.visibilityHeight
  }

  private onClick() {
    this.scrollTarget.scrollTo({ top: 0, behavior: "smooth" })
    this.emit("ld-click")
  }

  private toLength(v: string) {
    return /^\d+$/.test(v) ? `${v}px` : v
  }

  render() {
    return html`
      <button
        type="button"
        class="ld-back-top__btn ${this.visible ? "is-visible" : ""}"
        style="right:${this.toLength(this.right)};bottom:${this.toLength(this.bottom)}"
        aria-label="回到顶部"
        @click=${this.onClick}
      >
        <ld-icon name="arrow-up-line"></ld-icon>
      </button>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-back-top": LdBackTop
  }
}
