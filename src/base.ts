import { LitElement } from "lit"

/** 判断一个子节点是否算“有内容”（空白文本与注释不算） */
function isMeaningful(node: ChildNode): boolean {
  if (node.nodeType === Node.COMMENT_NODE) return false
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").trim().length > 0
  }
  return true
}

/** 内容节点写入的插槽名，没有 `slot` 属性即为默认插槽 */
function slotNameOf(node: ChildNode): string {
  return node.nodeType === Node.ELEMENT_NODE
    ? ((node as Element).getAttribute("slot") ?? "")
    : ""
}

/** 插槽是否直接属于该宿主（中间不跨过其它自定义元素） */
function isOwnSlot(host: HTMLElement, slot: Element): boolean {
  let parent = slot.parentElement
  while (parent && parent !== host) {
    if (parent.tagName.includes("-")) return false
    parent = parent.parentElement
  }
  return parent === host
}

/**
 * 组件基类：使用 Light DOM 渲染（不创建 Shadow Root），
 * 样式全部由全局 CSS 提供，使用者可以自行覆盖。
 *
 * Light DOM 下浏览器不会投影 `<slot>`：组件模板渲染出的节点会被追加到宿主
 * 原有子节点之后，使用方写的内容反而留在包裹元素外面。基类把使用方写在宿主
 * 体内的节点搬进模板里对应的 `<slot>`（`slot` 的默认样式是 `display: contents`，
 * 搬入后的渲染位置就等于插槽所在位置），让模板里的 `<slot>` 在 Light DOM 下
 * 也能正常参与布局。
 *
 * 具名插槽按内容节点上的 `slot="name"` 属性匹配，写法与 Shadow DOM 一致；
 * 对不上任何插槽的节点保持原位，交给使用方自己接管。
 *
 * 判断插槽有没有内容一律基于「使用方写的原始节点」，因此在首次渲染之前就是
 * 准确的，不需要像 Shadow DOM 那样等 `slotchange` 事件。子类覆写
 * `slottedContentChanged()` 即可基于插槽内容推导自己的状态。
 */
export class LdElement extends LitElement {
  /** 使用方书写在宿主体内的节点，首次渲染前采集，之后一直复用这份引用 */
  private __ldContent: ChildNode[] | null = null
  /** 是否已经通知过子类插槽内容就位 */
  private __ldNotified = false

  createRenderRoot(): this {
    this.__ldCaptureContent()
    return this
  }

  connectedCallback(): void {
    // 采集必须赶在 Lit 往宿主里追加模板节点之前
    this.__ldCaptureContent()
    super.connectedCallback()
  }

  private __ldCaptureContent(): void {
    this.__ldContent ??= Array.from(this.childNodes)
  }

  protected performUpdate(): void {
    // 插槽状态要在渲染之前算好，渲染之后再补会把改动丢进已经结束的更新周期
    if (this.__ldContent?.length && !this.__ldNotified) {
      this.__ldNotified = true
      this.slottedContentChanged()
    }
    super.performUpdate()
    // 每次更新后重新对齐：render() 换用结构不同的模板时，旧节点连带插槽里的
    // 内容会一起被 Lit 清掉，这里负责把它们接回新模板的插槽
    this.__ldSyncSlots()
  }

  /**
   * 插槽内容就位后调用，先于首次渲染执行。
   * 子类覆写它来派生依赖插槽内容的状态，替代 Shadow DOM 下的 `slotchange`。
   */
  protected slottedContentChanged(): void {}

  /** 取某个插槽元素，`name` 为空表示默认插槽 */
  protected getSlot(name = ""): HTMLSlotElement | null {
    for (const slot of this.querySelectorAll("slot")) {
      if ((slot.getAttribute("name") ?? "") !== name) continue
      if (isOwnSlot(this, slot)) return slot
    }
    return null
  }

  /** 某个插槽里是否有内容 */
  protected slotHasContent(name = ""): boolean {
    return this.__ldContentOf(name).some(isMeaningful)
  }

  /** 某个插槽里的纯文本内容（已去掉首尾空白） */
  protected slotText(name = ""): string {
    return this.__ldContentOf(name)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim()
  }

  /** 使用方写进某个插槽的原始节点 */
  private __ldContentOf(name: string): ChildNode[] {
    return (this.__ldContent ?? []).filter((node) => slotNameOf(node) === name)
  }

  /**
   * 把使用方的节点搬进对应的插槽。
   *
   * 位置已经正确的节点不会被动，避免无谓的 DOM 抖动打断输入焦点。
   */
  private __ldSyncSlots(): void {
    const content = this.__ldContent
    if (!content?.length) return

    const slots = Array.from(this.querySelectorAll("slot")).filter((slot) =>
      isOwnSlot(this, slot),
    )
    if (!slots.length) return

    const named = new Map<string, HTMLSlotElement>()
    let defaultSlot: HTMLSlotElement | null = null
    for (const slot of slots) {
      const name = slot.getAttribute("name") ?? ""
      if (name === "") {
        defaultSlot ??= slot
      } else if (!named.has(name)) {
        named.set(name, slot)
      }
    }

    // 按内容顺序分组，保证同一插槽内的先后关系与使用方书写顺序一致
    const groups = new Map<HTMLSlotElement, ChildNode[]>()
    for (const node of content) {
      const name = slotNameOf(node)
      const target = name === "" ? defaultSlot : (named.get(name) ?? null)
      if (!target) continue
      const group = groups.get(target)
      if (group) {
        group.push(node)
      } else {
        groups.set(target, [node])
      }
    }

    for (const [slot, nodes] of groups) {
      const current = Array.from(slot.childNodes).filter((node) =>
        nodes.includes(node),
      )
      const settled =
        current.length === nodes.length &&
        current.every((node, index) => node === nodes[index])
      if (settled) continue
      for (const node of nodes) {
        slot.appendChild(node)
      }
    }
  }

  /**
   * 向组件外部派发一个可冒泡的自定义事件。
   * 约定事件名以 `ld-` 开头，例如 `ld-change`。
   */
  protected emit<T = unknown,>(type: string, detail?: T): boolean {
    return this.dispatchEvent(
      new CustomEvent(type, { detail, bubbles: true, composed: true }),
    )
  }
}

/** 注册自定义元素，避免重复注册报错。 */
export function define(tag: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor)
  }
}
