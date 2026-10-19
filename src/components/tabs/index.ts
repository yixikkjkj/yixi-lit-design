import { html, nothing } from "lit"
import { property } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type TabsType = "line" | "card"

/**
 * 标签页面板，作为 ld-tabs 的子级使用。
 *
 * @slot - 面板内容
 *
 * @example
 * ```html
 * <ld-tab label="用户管理" name="user">用户管理内容</ld-tab>
 * ```
 */
export class LdTab extends LdElement {
  /** 页签标题 */
  @property({ type: String }) label = ""
  /** 唯一标识，缺省使用在 ld-tabs 中的序号 */
  @property({ type: String }) name = ""
  /** 是否禁用该页签 */
  @property({ type: Boolean }) disabled = false

  render() {
    return html`<slot></slot>`
  }
}

/**
 * 标签页组件：读取子级 ld-tab 渲染导航条，仅显示激活面板。
 *
 * @slot - 若干 ld-tab
 * @fires ld-change - 切换页签时触发，detail 为 { name }
 *
 * @example
 * ```html
 * <ld-tabs active="user">
 *   <ld-tab label="用户管理" name="user">用户管理内容</ld-tab>
 *   <ld-tab label="配置管理" name="config">配置管理内容</ld-tab>
 *   <ld-tab label="禁用页签" name="disabled" disabled>不可见</ld-tab>
 * </ld-tabs>
 * <ld-tabs type="card">...</ld-tabs>
 * ```
 */
export class LdTabs extends LdElement {
  /** 当前激活页签的 name，缺省为第一个页签 */
  @property({ type: String }) active = ""
  /** 页签样式类型 */
  @property({ type: String }) type: TabsType = "line"

  /** 子级变化时重新渲染导航条 */
  private mo = new MutationObserver((records) => {
    if (
      records.some((record) =>
        record.type === "attributes"
          ? (record.target as Element).closest("ld-tabs") === this
          : [...record.addedNodes, ...record.removedNodes].some(
              (node) => node instanceof Element && node.matches("ld-tab"),
            ),
      )
    )
      this.requestUpdate()
  })

  connectedCallback() {
    super.connectedCallback()
    this.mo.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["label", "name", "disabled"],
    })
  }

  disconnectedCallback() {
    this.mo.disconnect()
    super.disconnectedCallback()
  }

  firstUpdated() {
    // 等待子级解析完成后刷新一次导航条
    requestAnimationFrame(() => this.requestUpdate())
  }

  updated() {
    this.syncPanels()
    this.updateInk()
  }

  private get tabs(): LdTab[] {
    return Array.from(this.querySelectorAll("ld-tab")).filter(
      (tab) => tab.closest("ld-tabs") === this,
    )
  }

  /** 页签的实际 name（缺省用序号） */
  private tabName(tab: LdTab, index: number): string {
    return tab.name || String(index)
  }

  private get activeName(): string {
    const tabs = this.tabs
    if (this.active) return this.active
    return tabs.length ? this.tabName(tabs[0], 0) : ""
  }

  private onTabClick(tab: LdTab, name: string) {
    if (tab.disabled || name === this.activeName) return
    this.active = name
    this.emit("ld-change", { name })
  }

  /** 只显示激活的 ld-tab，其余设置 hidden */
  private syncPanels() {
    const active = this.activeName
    this.tabs.forEach((tab, i) => {
      tab.toggleAttribute("hidden", this.tabName(tab, i) !== active)
    })
  }

  /** 移动激活下划线到当前页签 */
  private updateInk() {
    const ink = this.querySelector<HTMLElement>(".ld-tabs__ink")
    if (!ink) return
    const item = this.querySelector<HTMLElement>(".ld-tabs__item.is-active")
    if (item) {
      ink.style.left = `${item.offsetLeft}px`
      ink.style.width = `${item.offsetWidth}px`
      ink.style.opacity = "1"
    } else {
      ink.style.opacity = "0"
    }
  }

  render() {
    const type = this.type === "card" ? "card" : "line"
    const active = this.activeName
    return html`
      <div class="ld-tabs__nav-wrap ld-tabs__nav-wrap--${type}">
        <div class="ld-tabs__nav ld-tabs__nav--${type}" role="tablist">
          ${this.tabs.map((tab, i) => {
            const name = this.tabName(tab, i)
            const classes = [
              "ld-tabs__item",
              name === active ? "is-active" : "",
              tab.disabled ? "is-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")
            return html`
              <div
                class=${classes}
                role="tab"
                aria-selected=${name === active ? "true" : "false"}
                @click=${() => this.onTabClick(tab, name)}
              >
                ${tab.label}
              </div>
            `
          })}
          ${
            type === "line" ? html`<span class="ld-tabs__ink"></span>` : nothing
          }
        </div>
      </div>
      <div class="ld-tabs__panels"><slot></slot></div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ld-tabs": LdTabs
    "ld-tab": LdTab
  }
}
