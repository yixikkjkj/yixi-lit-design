import { html, nothing } from "lit"
import { customElement, property, state } from "lit/decorators.js"
import { LdElement, define } from "../../base.js"

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"]

interface DayCell {
  year: number
  month: number
  day: number
  /** 是否为当前展示月的日期 */
  current: boolean
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

/**
 * 日期选择器组件。
 *
 * @fires ld-change - 选中日期时触发，detail 为 { value }（YYYY-MM-DD）
 *
 * @example
 * ```html
 * <ld-date-picker value="2026-10-16" placeholder="请选择日期" clearable></ld-date-picker>
 * ```
 */
@customElement("ld-date-picker")
export class LdDatePicker extends LdElement {
  /** 绑定值，格式 YYYY-MM-DD */
  @property({ type: String }) value = ""
  /** 占位文本 */
  @property({ type: String }) placeholder = "请选择日期"
  /** 是否禁用 */
  @property({ type: Boolean }) disabled = false
  /** 是否可清空 */
  @property({ type: Boolean }) clearable = false

  /** 面板是否展开 */
  @state() private open = false
  /** 是否 hover（用于控制清空图标显示） */
  @state() private hovered = false
  /** 当前面板展示的年 */
  @state() private viewYear = new Date().getFullYear()
  /** 当前面板展示的月（0-11） */
  @state() private viewMonth = new Date().getMonth()

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener("click", this.onDocumentClick)
    this.syncViewFromValue()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener("click", this.onDocumentClick)
  }

  private onDocumentClick = (e: Event) => {
    if (!this.open) return
    if (!e.composedPath().includes(this)) {
      this.open = false
    }
  }

  /** 根据 value 同步面板展示的月份 */
  private syncViewFromValue() {
    const date = this.parseValue()
    if (date) {
      this.viewYear = date.getFullYear()
      this.viewMonth = date.getMonth()
    }
  }

  private parseValue(): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.value)
    if (!match) return null
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    )
    return Number.isNaN(date.getTime()) ? null : date
  }

  private toggleOpen() {
    if (this.disabled) return
    if (!this.open) this.syncViewFromValue()
    this.open = !this.open
  }

  private shiftMonth(delta: number) {
    const date = new Date(this.viewYear, this.viewMonth + delta, 1)
    this.viewYear = date.getFullYear()
    this.viewMonth = date.getMonth()
  }

  private shiftYear(delta: number) {
    this.viewYear += delta
  }

  /** 生成 6x7 的日期网格（周一开头，含上月/下月补位） */
  private get dayCells(): DayCell[] {
    const first = new Date(this.viewYear, this.viewMonth, 1)
    const offset = (first.getDay() + 6) % 7
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate()
    const prev = new Date(this.viewYear, this.viewMonth - 1, 1)
    const next = new Date(this.viewYear, this.viewMonth + 1, 1)

    const cells: DayCell[] = []
    for (let i = offset - 1; i >= 0; i--) {
      cells.push({
        year: prev.getFullYear(),
        month: prev.getMonth(),
        day: daysInPrevMonth - i,
        current: false,
      })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        year: this.viewYear,
        month: this.viewMonth,
        day: d,
        current: true,
      })
    }
    let d = 1
    while (cells.length < 42) {
      cells.push({
        year: next.getFullYear(),
        month: next.getMonth(),
        day: d++,
        current: false,
      })
    }
    return cells
  }

  private onSelectDay(cell: DayCell) {
    const value = formatDate(cell.year, cell.month, cell.day)
    this.value = value
    if (!cell.current) {
      this.viewYear = cell.year
      this.viewMonth = cell.month
    }
    this.open = false
    this.emit("ld-change", { value })
  }

  private onSelectToday(e: Event) {
    e.stopPropagation()
    const now = new Date()
    this.viewYear = now.getFullYear()
    this.viewMonth = now.getMonth()
    this.value = formatDate(now.getFullYear(), now.getMonth(), now.getDate())
    this.open = false
    this.emit("ld-change", { value: this.value })
  }

  private onClear(e: Event) {
    e.stopPropagation()
    this.value = ""
    this.emit("ld-change", { value: "" })
  }

  render() {
    const today = new Date()
    const todayStr = formatDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    const showClear =
      this.clearable && !this.disabled && !!this.value && this.hovered
    const classes = [
      "ld-date-picker",
      this.open ? "is-open" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <div
        class=${classes}
        @mouseenter=${() => (this.hovered = true)}
        @mouseleave=${() => (this.hovered = false)}
      >
        <div class="ld-date-picker__trigger" @click=${this.toggleOpen}>
          <ld-icon name="calendar-line"></ld-icon>
          <span class=${
            this.value ? "ld-date-picker__value" : "ld-date-picker__placeholder"
          }>
            ${this.value || this.placeholder}
          </span>
          ${
            showClear
              ? html`<ld-icon class="ld-date-picker__clear" name="close-circle-fill" @click=${this.onClear}></ld-icon>`
              : nothing
          }
        </div>
        <div class="ld-date-picker__panel">
          <div class="ld-date-picker__header">
            <ld-icon name="d-arrow-left" @click=${() =>
              this.shiftYear(-1)}></ld-icon>
            <ld-icon name="arrow-left-s-line" @click=${() =>
              this.shiftMonth(-1)}></ld-icon>
            <span class="ld-date-picker__title">${this.viewYear} 年 ${this.viewMonth + 1} 月</span>
            <ld-icon name="arrow-right-s-line" @click=${() =>
              this.shiftMonth(1)}></ld-icon>
            <ld-icon name="d-arrow-right" @click=${() =>
              this.shiftYear(1)}></ld-icon>
          </div>
          <div class="ld-date-picker__weekdays">
            ${WEEKDAYS.map((w) => html`<span>${w}</span>`)}
          </div>
          <div class="ld-date-picker__grid">
            ${this.dayCells.map((cell) => {
              const dateStr = formatDate(cell.year, cell.month, cell.day)
              const cellClasses = [
                "ld-date-picker__day",
                !cell.current ? "is-adjacent" : "",
                dateStr === todayStr ? "is-today" : "",
                dateStr === this.value ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")
              return html`<span class=${cellClasses} @click=${() =>
                this.onSelectDay(cell)}>${cell.day}</span>`
            })}
          </div>
          <div class="ld-date-picker__footer">
            <span class="ld-date-picker__today-btn" @click=${this.onSelectToday}>今天</span>
          </div>
        </div>
      </div>
    `
  }
}

define("ld-date-picker", LdDatePicker)

declare global {
  interface HTMLElementTagNameMap {
    "ld-date-picker": LdDatePicker
  }
}
