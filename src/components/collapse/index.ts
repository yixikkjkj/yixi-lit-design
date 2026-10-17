import { html } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

/**
 * 折叠面板容器，与 `ld-collapse-item` 配合使用。
 *
 * @slot - 一个或多个 `ld-collapse-item`
 * @fires ld-change - 展开项变化时触发，detail: { active: string[] }
 *
 * @example
 * ```html
 * <ld-collapse active="1" @ld-change=${(e) => console.log(e.detail.active)}>
 *   <ld-collapse-item title="标题一" name="1">内容一</ld-collapse-item>
 *   <ld-collapse-item title="标题二" name="2">内容二</ld-collapse-item>
 * </ld-collapse>
 * <ld-collapse accordion>
 *   <ld-collapse-item title="手风琴">内容</ld-collapse-item>
 * </ld-collapse>
 * ```
 */
export class LdCollapse extends LdElement {
  /** 当前展开项的 name，空格分隔多个 */
  @property({ type: String }) active = ""
  /** 手风琴模式，同时只能展开一项 */
  @property({ type: Boolean }) accordion = false

  private get activeNames(): string[] {
    return this.active.split(/\s+/).filter(Boolean)
  }

  /** 由 item 调用：切换某项的展开状态 */
  toggleItem(name: string) {
    let names = this.activeNames
    if (names.includes(name)) {
      names = names.filter((n) => n !== name)
    } else if (this.accordion) {
      names = [name]
    } else {
      names = [...names, name]
    }
    this.active = names.join(" ")
    this.emit("ld-change", { active: names })
  }

  /** 由 item 调用：判断某项是否展开 */
  isItemActive(name: string): boolean {
    return this.activeNames.includes(name)
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("active")) {
      this.querySelectorAll("ld-collapse-item").forEach((item) => {
        ;(item as LdCollapseItem).syncExpanded()
      })
    }
  }

  render() {
    return html`<div class="ld-collapse"><slot></slot></div>`
  }
}

/**
 * 折叠面板项，必须放在 `ld-collapse` 内使用。
 *
 * @slot - 面板内容
 * @example
 * ```html
 * <ld-collapse-item title="面板标题" name="1">面板内容</ld-collapse-item>
 * ```
 */
export class LdCollapseItem extends LdElement {
  /** 面板标题 */
  @property({ type: String }) title = ""
  /** 唯一标识，缺省时使用序号 */
  @property({ type: String }) name = ""
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false

  /** 展开状态（由父容器同步） */
  @state() private expanded = false

  private _fallbackName = ""

  connectedCallback() {
    super.connectedCallback()
    if (!this.name) {
      const items = Array.from(
        this.closest("ld-collapse")?.querySelectorAll("ld-collapse-item") ?? [],
      )
      const index = items.indexOf(this)
      this._fallbackName = String(index >= 0 ? index + 1 : 1)
    }
    this.syncExpanded()
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has("name")) {
      this.syncExpanded()
    }
  }

  private get effectiveName(): string {
    return this.name || this._fallbackName
  }

  private get collapse(): LdCollapse | null {
    return this.closest("ld-collapse")
  }

  /** 由父容器调用：同步展开状态（需为 public 供 LdCollapse 访问） */
  syncExpanded() {
    const collapse = this.collapse
    if (collapse) {
      this.expanded = collapse.isItemActive(this.effectiveName)
    }
  }

  private onHeaderClick() {
    if (this.disabled) return
    this.collapse?.toggleItem(this.effectiveName)
  }

  render() {
    const classes = [
      "ld-collapse-item",
      this.expanded ? "is-active" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <div class=${classes}>
        <div class="ld-collapse-item__header" @click=${this.onHeaderClick}>
          <span class="ld-collapse-item__title">${this.title}</span>
          <ld-icon class="ld-collapse-item__arrow" name="arrow-right-s-line"></ld-icon>
        </div>
        <div class="ld-collapse-item__wrap">
          <div class="ld-collapse-item__content"><slot></slot></div>
        </div>
      </div>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-collapse": LdCollapse
    "ld-collapse-item": LdCollapseItem
  }
}
