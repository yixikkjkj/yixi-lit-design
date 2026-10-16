import { html, nothing } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

/**
 * 卡片组件，承载一组相关信息。
 *
 * @slot cover - 顶部封面（图片或任意内容）
 * @slot header - 自定义头部，优先于 title / subtitle
 * @slot extra - 头部右侧操作区
 * @slot - 卡片正文
 * @slot footer - 底部操作区
 *
 * @example
 * ```html
 * <ld-card title="卡片标题" subtitle="副标题">
 *   <p>正文内容</p>
 *   <div slot="footer"><ld-button variant="primary">确定</ld-button></div>
 * </ld-card>
 * ```
 */
@customElement("ld-card")
export class LdCard extends LdElement {
  /** 标题 */
  @property({ type: String }) title = ""
  /** 副标题 */
  @property({ type: String }) subtitle = ""
  /** 是否显示边框 */
  @property({ type: Boolean }) bordered = true
  /** 悬浮时是否抬起（阴影 + 位移） */
  @property({ type: Boolean }) hoverable = false
  /** 是否在头部下方显示分割线 */
  @property({ type: Boolean, attribute: "header-bordered" }) headerBordered =
    true

  /** 各具名插槽是否注入了内容 */
  @state() private hasCover = false
  @state() private hasHeader = false
  @state() private hasExtra = false
  @state() private hasFooter = false

  protected slottedContentChanged() {
    this.hasCover = this.slotHasContent("cover")
    this.hasHeader = this.slotHasContent("header")
    this.hasExtra = this.slotHasContent("extra")
    this.hasFooter = this.slotHasContent("footer")
  }

  private get showHeader(): boolean {
    return this.hasHeader || this.hasExtra || !!this.title || !!this.subtitle
  }

  render() {
    const classes = [
      "ld-card",
      this.bordered ? "is-bordered" : "",
      this.hoverable ? "is-hoverable" : "",
      this.headerBordered && this.showHeader ? "is-header-bordered" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return html`
      <div class=${classes}>
        <div class="ld-card__cover" ?hidden=${!this.hasCover}>
          <slot name="cover"></slot>
        </div>
        <div class="ld-card__header" ?hidden=${!this.showHeader}>
          <div class="ld-card__heading">
            <slot name="header"></slot>
            ${
              !this.hasHeader && (this.title || this.subtitle)
                ? html`
                  <div class="ld-card__title">${this.title}</div>
                  ${
                    this.subtitle
                      ? html`<div class="ld-card__subtitle">${this.subtitle}</div>`
                      : nothing
                  }
                `
                : nothing
            }
          </div>
          <div class="ld-card__extra">
            <slot name="extra"></slot>
          </div>
        </div>
        <div class="ld-card__body"><slot></slot></div>
        <div class="ld-card__footer" ?hidden=${!this.hasFooter}>
          <slot name="footer"></slot>
        </div>
      </div>
    `
  }
}

define("ld-card", LdCard)

declare global {
  interface HTMLElementTagNameMap {
    "ld-card": LdCard
  }
}
