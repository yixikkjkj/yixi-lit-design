import { html, nothing } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

/** 判断分隔符是否为图标名（如 arrow-right-s-line） */
function isIconName(separator: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)+$/i.test(separator)
}

/**
 * 面包屑导航项，作为 ld-breadcrumb 的子级使用。
 *
 * @slot - 项文本
 *
 * @example
 * ```html
 * <ld-breadcrumb-item href="/">首页</ld-breadcrumb-item>
 * <ld-breadcrumb-item>当前页</ld-breadcrumb-item>
 * ```
 */
export class LdBreadcrumbItem extends LdElement {
  /** 跳转链接，缺省渲染为纯文本 */
  @property({ type: String }) href = ""
  /** 原生 target 属性 */
  @property({ type: String }) target = ""
  /** 分隔符（由 ld-breadcrumb 同步，也可单独设置；图标名渲染为 ld-icon） */
  @property({ type: String }) separator = "/"

  render() {
    return html`
      ${
        this.href
          ? html`<a
            class="ld-breadcrumb-item__inner ld-breadcrumb-item__link"
            href=${this.href}
            target=${this.target || nothing}
            ><slot></slot
          ></a>`
          : html`<span class="ld-breadcrumb-item__inner"><slot></slot></span>`
      }
      <span class="ld-breadcrumb-item__separator" aria-hidden="true"
        >${
          isIconName(this.separator)
            ? html`<ld-icon name=${this.separator}></ld-icon>`
            : this.separator
        }</span
      >
    `
  }
}

/**
 * 面包屑导航组件。
 *
 * @slot - 若干 ld-breadcrumb-item
 *
 * @example
 * ```html
 * <ld-breadcrumb>
 *   <ld-breadcrumb-item href="/">首页</ld-breadcrumb-item>
 *   <ld-breadcrumb-item href="/list">列表</ld-breadcrumb-item>
 *   <ld-breadcrumb-item>详情</ld-breadcrumb-item>
 * </ld-breadcrumb>
 * <ld-breadcrumb separator="arrow-right-s-line">...</ld-breadcrumb>
 * ```
 */
export class LdBreadcrumb extends LdElement {
  /** 分隔符，默认为 "/"，也可传 Remix Icon 名称（如 arrow-right-s-line） */
  @property({ type: String }) separator = "/"

  firstUpdated() {
    this.syncItems()
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("separator")) {
      this.syncItems()
    }
  }

  /** 将分隔符同步给所有子项 */
  private syncItems() {
    for (const item of this.querySelectorAll("ld-breadcrumb-item")) {
      ;(item as LdBreadcrumbItem).separator = this.separator
    }
  }

  render() {
    return html`<slot></slot>`
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-breadcrumb": LdBreadcrumb
    "ld-breadcrumb-item": LdBreadcrumbItem
  }
}
