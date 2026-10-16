import { html, nothing } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

/** 滚动定位判定的顶部偏移量（px） */
const SCROLL_OFFSET = 100

/**
 * 锚点导航项，作为 ld-anchor 的子级使用，可嵌套实现多级缩进。
 *
 * @slot - 链接文本（也可使用 label 属性）；嵌套的 ld-anchor-link 渲染为缩进子级
 * @fires ld-change - 点击链接时触发，detail 为 { href }
 *
 * @example
 * ```html
 * <ld-anchor-link href="#basic" label="基础用法"></ld-anchor-link>
 * ```
 */
@customElement("ld-anchor-link")
export class LdAnchorLink extends LdElement {
  /** 目标锚点，#xxx 形式 */
  @property({ type: String }) href = ""
  /** 链接文本 */
  @property({ type: String }) label = ""
  /** 是否为当前高亮项（由 ld-anchor 维护） */
  @property({ type: Boolean }) active = false

  private onClick(e: Event) {
    e.preventDefault()
    const target = this.getTarget()
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
    this.emit("ld-change", { href: this.href })
  }

  /** 获取 href 对应的目标元素 */
  getTarget(): Element | null {
    if (!this.href) return null
    try {
      return document.querySelector(this.href)
    } catch {
      return null
    }
  }

  render() {
    return html`
      <a
        class="ld-anchor-link__title ${this.active ? "is-active" : ""}"
        href=${this.href || nothing}
        @click=${this.onClick}
      >
        ${this.label}<slot></slot>
      </a>
    `
  }
}

/**
 * 锚点导航组件：左侧竖线样式，随页面滚动高亮当前锚点。
 *
 * @slot - 若干 ld-anchor-link
 * @fires ld-change - 点击子链接时触发（由 ld-anchor-link 冒泡），detail 为 { href }
 *
 * @example
 * ```html
 * <ld-anchor>
 *   <ld-anchor-link href="#basic" label="基础用法"></ld-anchor-link>
 *   <ld-anchor-link href="#api" label="API">
 *     <ld-anchor-link href="#props" label="属性"></ld-anchor-link>
 *   </ld-anchor-link>
 * </ld-anchor>
 * ```
 */
@customElement("ld-anchor")
export class LdAnchor extends LdElement {
  /** 当前高亮锚点的 href */
  @state() private activeHref = ""

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener("scroll", this.onScroll, { passive: true })
    this.addEventListener("ld-change", this.onLinkChange)
  }

  disconnectedCallback() {
    window.removeEventListener("scroll", this.onScroll)
    this.removeEventListener("ld-change", this.onLinkChange)
    super.disconnectedCallback()
  }

  firstUpdated() {
    const links = this.getLinks()
    if (!this.activeHref && links.length) {
      this.activeHref = links[0].href
    }
    this.onScroll()
  }

  updated() {
    this.syncActive()
    this.updateInk()
  }

  private getLinks(): LdAnchorLink[] {
    return Array.from(this.querySelectorAll("ld-anchor-link"))
  }

  private onLinkChange = (e: Event) => {
    const { href } = (e as CustomEvent<{ href: string }>).detail
    if (href && href !== this.activeHref) {
      this.activeHref = href
    }
  }

  private onScroll = () => {
    const links = this.getLinks()
    let current = ""
    for (const link of links) {
      const el = link.getTarget()
      if (el && el.getBoundingClientRect().top <= SCROLL_OFFSET) {
        current = link.href
      }
    }
    if (!current && links.length) {
      const first = links[0].getTarget()
      // 尚未滚动到第一个锚点前，保持第一项高亮
      current = first ? links[0].href : this.activeHref
    }
    if (current && current !== this.activeHref) {
      this.activeHref = current
    }
  }

  private syncActive() {
    for (const link of this.getLinks()) {
      link.active = link.href === this.activeHref
    }
  }

  /** 移动左侧竖线指示块到当前高亮项 */
  private updateInk() {
    const ink = this.querySelector<HTMLElement>(".ld-anchor__ink")
    if (!ink) return
    const activeLink = this.getLinks().find((l) => l.href === this.activeHref)
    const title = activeLink?.querySelector<HTMLElement>(
      ".ld-anchor-link__title",
    )
    if (activeLink && title) {
      ink.style.opacity = "1"
      ink.style.transform = `translateY(${title.offsetTop}px)`
      ink.style.height = `${title.offsetHeight}px`
    } else {
      ink.style.opacity = "0"
    }
  }

  render() {
    return html`
      <div class="ld-anchor__rail"><span class="ld-anchor__ink"></span></div>
      <slot></slot>
    `
  }
}

define("ld-anchor-link", LdAnchorLink)
define("ld-anchor", LdAnchor)

declare global {
  interface HTMLElementTagNameMap {
    "ld-anchor": LdAnchor
    "ld-anchor-link": LdAnchorLink
  }
}
