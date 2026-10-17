import { html, nothing } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

export type AvatarSize = "s" | "m" | "l"
export type AvatarShape = "circle" | "round"

/**
 * 头像组件，用于展示用户或事物标识，支持图片、图标与文字三种形态。
 *
 * @slot - 无图片与图标时显示的文字内容
 *
 * @example
 * ```html
 * <ld-avatar src="/user.png" alt="张三"></ld-avatar>
 * <ld-avatar>腾</ld-avatar>
 * <ld-avatar icon="user-line" size="l" shape="round"></ld-avatar>
 * ```
 */
export class LdAvatar extends LdElement {
  /** 图片地址 */
  @property({ type: String }) src = ""
  /** 图片替代文本 */
  @property({ type: String }) alt = ""
  /** 图标名（Remix Icon，不带 ri- 前缀） */
  @property({ type: String }) icon = ""
  /** 尺寸 */
  @property({ type: String }) size: AvatarSize = "m"
  /** 形状 */
  @property({ type: String }) shape: AvatarShape = "circle"

  /** 图片加载失败时回退到图标或文字 */
  @state() private imgFailed = false

  updated(changed: Map<string, unknown>) {
    if (changed.has("src")) {
      this.imgFailed = false
    }
  }

  render() {
    const classes = [
      "ld-avatar",
      `ld-avatar--${this.size}`,
      `ld-avatar--${this.shape}`,
    ].join(" ")
    const showImage = !!this.src && !this.imgFailed

    return html`
      <div class=${classes}>
        ${
          showImage
            ? html`<img
              class="ld-avatar__img"
              src=${this.src}
              alt=${this.alt}
              @error=${() => (this.imgFailed = true)}
            />`
            : this.icon
              ? html`<ld-icon class="ld-avatar__icon" name=${this.icon}></ld-icon>`
              : html`<span class="ld-avatar__text"><slot></slot></span>`
        }
      </div>
    `
  }
}

/**
 * 头像组，多个头像叠放展示，可限制最多显示数量。
 *
 * @slot - 若干 ld-avatar
 *
 * @example
 * ```html
 * <ld-avatar-group max="3" size="m">
 *   <ld-avatar src="/a.png"></ld-avatar>
 *   <ld-avatar src="/b.png"></ld-avatar>
 *   <ld-avatar src="/c.png"></ld-avatar>
 *   <ld-avatar src="/d.png"></ld-avatar>
 * </ld-avatar-group>
 * ```
 */
export class LdAvatarGroup extends LdElement {
  /** 最多显示的头像数量，0 表示不限制 */
  @property({ type: Number }) max = 0
  /** 叠放方向：从左往右或从右往左 */
  @property({ type: String }) cascading: "left" | "right" = "right"
  /** 尺寸，仅作用于「+N」占位头像 */
  @property({ type: String }) size: AvatarSize = "m"
  /** 形状，仅作用于「+N」占位头像 */
  @property({ type: String }) shape: AvatarShape = "circle"

  /** 子头像总数 */
  @state() private total = 0

  updated() {
    this.syncChildren()
  }

  protected slottedContentChanged() {
    this.syncChildren()
  }

  private syncChildren() {
    const avatars = Array.from(this.querySelectorAll<LdAvatar>("ld-avatar"))
    this.total = avatars.length
    avatars.forEach((avatar, index) => {
      avatar.hidden = this.max > 0 && index >= this.max
    })
  }

  render() {
    const rest = this.max > 0 ? this.total - this.max : 0
    const classes = [
      "ld-avatar-group",
      this.cascading === "left" ? "is-cascading-left" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return html`
      <div class=${classes}>
        <slot></slot>
        ${
          rest > 0
            ? html`<div
              class="ld-avatar ld-avatar--${this.size} ld-avatar--${this.shape} ld-avatar-group__rest"
            >
              +${rest}
            </div>`
            : nothing
        }
      </div>
    `
  }
}


declare global {
  interface HTMLElementTagNameMap {
    "ld-avatar": LdAvatar
    "ld-avatar-group": LdAvatarGroup
  }
}
