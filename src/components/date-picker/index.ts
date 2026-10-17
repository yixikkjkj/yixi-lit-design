import { html, nothing, type PropertyValues } from "lit"
import { property, state } from "lit/decorators.js"
import { LdElement } from "../../base.js"

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"]
export type DatePickerValue = string | [] | [string, string]

interface DayCell {
  year: number
  month: number
  day: number
  current: boolean
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return formatDate(date.getFullYear(), date.getMonth(), date.getDate()) ===
    value
    ? date
    : null
}

/**
 * 日期 / 日期区间选择器。
 * @fires ld-change - 单日返回 { value: string }，区间完成后返回 { value: [开始日期, 结束日期] }；区间清空返回 []。
 * @example
 * ```html
 * <ld-date-picker value="2026-10-16" clearable></ld-date-picker>
 * <ld-date-picker range value="2026-10-16,2026-11-02" clearable></ld-date-picker>
 * ```
 */
export class LdDatePicker extends LdElement {
  /** 单日为 YYYY-MM-DD；区间为二元数组，HTML 属性用逗号分隔 */
  @property({
    converter: {
      fromAttribute: (value: string | null) =>
        value?.includes(",")
          ? value.split(",").map((date) => date.trim())
          : (value ?? ""),
      toAttribute: (value: DatePickerValue) =>
        Array.isArray(value) ? value.join(",") : value,
    },
  })
  value: DatePickerValue = ""
  /** 是否选择日期区间 */
  @property({ type: Boolean }) range = false
  /** 占位文本，缺省按单日 / 区间模式显示 */
  @property({ type: String }) placeholder = ""
  @property({ type: Boolean }) disabled = false
  @property({ type: Boolean }) clearable = false

  @state() private open = false
  @state() private viewYear = new Date().getFullYear()
  @state() private viewMonth = new Date().getMonth()
  @state() private rangeStart = ""
  @state() private hoverDate = ""

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener("click", this.onDocumentClick)
    this.syncViewFromValue()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener("click", this.onDocumentClick)
    this.closePanel()
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has("value") || changed.has("range")) {
      this.resetDraft()
      this.syncViewFromValue()
    }
    if (this.disabled) this.closePanel()
  }

  private get selectedDates(): string[] {
    const values = Array.isArray(this.value)
      ? this.value
      : this.value.split(",")
    const dates = values
      .map((date) => date.trim())
      .filter((date) => parseDate(date))
    return this.range
      ? dates.length === 2
        ? dates.sort()
        : []
      : dates.slice(0, 1)
  }

  private get highlightedDates(): string[] {
    return this.range && this.rangeStart
      ? [this.rangeStart, this.hoverDate || this.rangeStart].sort()
      : this.selectedDates
  }

  private resetDraft() {
    this.rangeStart = ""
    this.hoverDate = ""
  }

  private closePanel() {
    this.open = false
    this.resetDraft()
  }

  private onDocumentClick = (event: Event) => {
    if (this.open && !event.composedPath().includes(this)) this.closePanel()
  }

  private syncViewFromValue() {
    const date = parseDate(this.selectedDates[0] ?? "")
    if (date) {
      this.viewYear = date.getFullYear()
      this.viewMonth = date.getMonth()
    }
  }

  private toggleOpen() {
    if (this.disabled) return
    if (this.open) this.closePanel()
    else {
      this.resetDraft()
      this.syncViewFromValue()
      this.open = true
    }
  }

  private onTriggerKeydown(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      this.toggleOpen()
    }
  }

  private onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && this.open) {
      event.stopPropagation()
      this.closePanel()
      this.querySelector<HTMLElement>(".ld-date-picker__trigger")?.focus()
    }
  }

  private shiftMonth(delta: number) {
    const date = new Date(this.viewYear, this.viewMonth + delta, 1)
    this.viewYear = date.getFullYear()
    this.viewMonth = date.getMonth()
  }

  private getDayCells(year: number, month: number): DayCell[] {
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, index - offset + 1)
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        current: date.getMonth() === month,
      }
    })
  }

  private onSelectDay(cell: DayCell) {
    if (this.disabled) return
    const date = formatDate(cell.year, cell.month, cell.day)
    if (this.range && !this.rangeStart) {
      this.rangeStart = date
      this.hoverDate = ""
      return
    }
    this.value = this.range
      ? [this.rangeStart, date].sort() as [string, string]
      : date
    this.closePanel()
    this.emit("ld-change", {
      value: Array.isArray(this.value) ? [...this.value] : this.value,
    })
    this.querySelector<HTMLElement>(".ld-date-picker__trigger")?.focus()
  }

  private onSelectToday() {
    const now = new Date()
    this.viewYear = now.getFullYear()
    this.viewMonth = now.getMonth()
    this.onSelectDay({
      year: this.viewYear,
      month: this.viewMonth,
      day: now.getDate(),
      current: true,
    })
  }

  private onClear(event: Event) {
    event.stopPropagation()
    if (this.disabled) return
    this.value = this.range ? [] : ""
    this.closePanel()
    this.emit("ld-change", { value: this.value })
    this.querySelector<HTMLElement>(".ld-date-picker__trigger")?.focus()
  }

  private renderCalendar(offset: number) {
    const monthDate = new Date(this.viewYear, this.viewMonth + offset, 1)
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const today = new Date()
    const todayStr = formatDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    const [start, end] = this.highlightedDates
    return html`
      <div class="ld-date-picker__calendar">
        ${
          this.range
            ? html`<div class="ld-date-picker__month-title">${year} 年 ${month + 1} 月</div>`
            : nothing
        }
        <div class="ld-date-picker__weekdays">${WEEKDAYS.map((day) => html`<span>${day}</span>`)}</div>
        <div class="ld-date-picker__grid" @mouseleave=${() =>
          (this.hoverDate = "")}>
          ${this.getDayCells(year, month).map((cell) => {
            const date = formatDate(cell.year, cell.month, cell.day)
            const selected = date === start || date === end
            const classes = [
              "ld-date-picker__day",
              !cell.current ? "is-adjacent" : "",
              date === todayStr ? "is-today" : "",
              selected ? "is-selected" : "",
              this.range && start && end && date > start && date < end
                ? "is-in-range"
                : "",
            ]
              .filter(Boolean)
              .join(" ")
            return html`<button type="button" class=${classes} aria-label=${date} aria-pressed=${selected}
              @mouseenter=${() => (this.hoverDate = date)} @focus=${() =>
                (this.hoverDate = date)}
              @click=${() => this.onSelectDay(cell)}>${cell.day}</button>`
          })}
        </div>
      </div>
    `
  }

  render() {
    const dates = this.selectedDates
    const displayValue = this.rangeStart
      ? `${this.rangeStart} 至 请选择结束日期`
      : dates.join(" 至 ")
    const placeholder =
      this.placeholder || (this.range ? "请选择日期区间" : "请选择日期")
    const classes = [
      "ld-date-picker",
      this.range ? "ld-date-picker--range" : "",
      this.open ? "is-open" : "",
      this.disabled ? "is-disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")
    return html`
      <div class=${classes} @keydown=${this.onKeydown}>
        <div class="ld-date-picker__trigger" role="button" tabindex=${
          this.disabled ? -1 : 0
        }
          aria-label=${placeholder} aria-expanded=${this.open} aria-disabled=${this.disabled} aria-haspopup="dialog"
          @keydown=${this.onTriggerKeydown} @click=${this.toggleOpen}>
          <ld-icon name="calendar-line"></ld-icon>
          <span class=${
            displayValue
              ? "ld-date-picker__value"
              : "ld-date-picker__placeholder"
          }>${displayValue || placeholder}</span>
          ${
            this.clearable && !this.disabled && dates.length
              ? html`<button type="button" class="ld-date-picker__clear" aria-label="清空日期" @click=${this.onClear}><ld-icon name="close-circle-fill"></ld-icon></button>`
              : nothing
          }
        </div>
        <div class="ld-date-picker__panel" role="dialog" aria-label=${
          this.range ? "选择日期区间" : "选择日期"
        }>
          <div class="ld-date-picker__header">
            <button type="button" aria-label="上一年" @click=${() =>
              this.shiftMonth(
                -12,
              )}><ld-icon name="arrow-left-double-line"></ld-icon></button>
            <button type="button" aria-label="上个月" @click=${() =>
              this.shiftMonth(
                -1,
              )}><ld-icon name="arrow-left-s-line"></ld-icon></button>
            <span class="ld-date-picker__title">${
              this.range
                ? "选择开始和结束日期"
                : `${this.viewYear} 年 ${this.viewMonth + 1} 月`
            }</span>
            <button type="button" aria-label="下个月" @click=${() =>
              this.shiftMonth(
                1,
              )}><ld-icon name="arrow-right-s-line"></ld-icon></button>
            <button type="button" aria-label="下一年" @click=${() =>
              this.shiftMonth(
                12,
              )}><ld-icon name="arrow-right-double-line"></ld-icon></button>
          </div>
          <div class="ld-date-picker__calendars">${this.renderCalendar(0)}${
            this.range ? this.renderCalendar(1) : nothing
          }</div>
          <div class="ld-date-picker__footer">
            ${
              this.range
                ? html`<span class="ld-date-picker__hint" aria-live="polite">${
                    this.rangeStart ? "请选择结束日期" : "请选择开始日期"
                  }</span>`
                : nothing
            }
            <button type="button" class="ld-date-picker__today-btn" @click=${this.onSelectToday}>今天</button>
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ld-date-picker": LdDatePicker
  }
}
