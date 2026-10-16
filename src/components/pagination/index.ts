import { html, nothing } from "lit"
import { customElement, property } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

type PageItem = number | "..."

/**
 * 分页组件。
 *
 * @fires ld-change - 切换页码时触发，detail 为 { current, pageSize }
 * @fires ld-size-change - 切换每页条数时触发，detail 为 { pageSize, current }
 *
 * @example
 * ```html
 * <ld-pagination total="100"></ld-pagination>
 * <ld-pagination total="500" page-size="20" current="3" page-sizes="10,20,50" show-jumper></ld-pagination>
 * ```
 */
@customElement("ld-pagination")
export class LdPagination extends LdElement {
  /** 总条数（必填） */
  @property({ type: Number }) total = 0
  /** 每页条数 */
  @property({ type: Number, attribute: "page-size" }) pageSize = 10
  /** 当前页码 */
  @property({ type: Number }) current = 1
  /** 可选每页条数，逗号分隔（如 "10,20,50"），设置后显示切换下拉 */
  @property({ type: String, attribute: "page-sizes" }) pageSizes = ""
  /** 是否显示跳转输入框 */
  @property({ type: Boolean, attribute: "show-jumper" }) showJumper = false

  /** 总页数 */
  private get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize))
  }

  /** 可选每页条数列表 */
  private get sizeOptions(): number[] {
    return this.pageSizes
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  }

  /** 页码序列：页数多时用省略号折叠，始终显示首尾页与当前页前后各 1 页 */
  private get pages(): PageItem[] {
    const count = this.pageCount
    const cur = Math.min(Math.max(1, this.current), count)
    if (count <= 7) {
      return Array.from({ length: count }, (_, i) => i + 1)
    }
    const result: PageItem[] = [1]
    const start = Math.max(2, cur - 1)
    const end = Math.min(count - 1, cur + 1)
    if (start > 2) result.push("...")
    for (let i = start; i <= end; i++) result.push(i)
    if (end < count - 1) result.push("...")
    result.push(count)
    return result
  }

  /** 跳转到指定页（自动收敛到 1..pageCount） */
  private goto(page: number) {
    const p = Math.min(Math.max(1, Math.round(page)), this.pageCount)
    if (p !== this.current) {
      this.current = p
      this.emit("ld-change", { current: this.current, pageSize: this.pageSize })
    }
  }

  private onPrev() {
    this.goto(this.current - 1)
  }

  private onNext() {
    this.goto(this.current + 1)
  }

  private onSizeChange(e: Event) {
    const size = Number((e.target as HTMLSelectElement).value)
    if (!size || size === this.pageSize) return
    this.pageSize = size
    if (this.current > this.pageCount) {
      this.current = this.pageCount
    }
    this.emit("ld-size-change", {
      pageSize: this.pageSize,
      current: this.current,
    })
  }

  private onJumperInput(e: Event) {
    const input = e.target as HTMLInputElement
    const page = Number(input.value)
    if (page) {
      this.goto(page)
    }
    input.value = ""
  }

  private onJumperKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.onJumperInput(e)
    }
  }

  render() {
    const sizes = this.sizeOptions
    return html`
      <button
        type="button"
        class="ld-pagination__btn"
        aria-label="上一页"
        ?disabled=${this.current <= 1}
        @click=${this.onPrev}
      >
        <ld-icon name="arrow-left-s-line"></ld-icon>
      </button>
      ${this.pages.map((p) =>
        p === "..."
          ? html`<span class="ld-pagination__more">…</span>`
          : html`<button
              type="button"
              class="ld-pagination__item ${
                p === this.current ? "is-active" : ""
              }"
              @click=${() => this.goto(p as number)}
            >
              ${p}
            </button>`,
      )}
      <button
        type="button"
        class="ld-pagination__btn"
        aria-label="下一页"
        ?disabled=${this.current >= this.pageCount}
        @click=${this.onNext}
      >
        <ld-icon name="arrow-right-s-line"></ld-icon>
      </button>
      ${
        sizes.length
          ? html`<select class="ld-pagination__sizes" @change=${this.onSizeChange}>
            ${sizes.map(
              (s) =>
                html`<option value=${s} ?selected=${s === this.pageSize}>
                  ${s} 条/页
                </option>`,
            )}
          </select>`
          : nothing
      }
      ${
        this.showJumper
          ? html`<span class="ld-pagination__jumper"
            >前往<input
              class="ld-pagination__jumper-input"
              type="number"
              min="1"
              max=${this.pageCount}
              @keydown=${this.onJumperKeydown}
              @change=${this.onJumperInput}
            />页</span
          >`
          : nothing
      }
      <span class="ld-pagination__total">共 ${this.total} 条</span>
    `
  }
}

define("ld-pagination", LdPagination)

declare global {
  interface HTMLElementTagNameMap {
    "ld-pagination": LdPagination
  }
}
