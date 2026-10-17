import { registerMessage } from "./register.js"

/**
 * 全局消息提示（纯 JS API，无自定义元素）。
 *
 * @example
 * ```ts
 * import { showMessage, message } from './components/message/index.js';
 *
 * showMessage({ content: '操作成功', type: 'success' });
 * message.success('保存成功');
 * message.warning({ content: '请注意', duration: 5000 });
 * message.danger('出错了');
 * message.info('提示信息');
 * ```
 */

export type MessageType = "success" | "warning" | "danger" | "info"

export interface MessageOptions {
  /** 提示内容 */
  content: string
  /** 类型 */
  type?: MessageType
  /** 自动关闭时长（毫秒），0 表示不自动关闭 */
  duration?: number
  /** 是否显示关闭按钮 */
  closable?: boolean
}

const TYPE_ICONS: Record<MessageType, string> = {
  success: "checkbox-circle-fill",
  warning: "error-warning-fill",
  danger: "close-circle-fill",
  info: "information-fill",
}

let container: HTMLElement | null = null

function getContainer(): HTMLElement {
  if (!container || !document.body.contains(container)) {
    container = document.createElement("div")
    container.className = "ld-message-container"
    document.body.appendChild(container)
  }
  return container
}

function close(el: HTMLElement) {
  if (!el.parentElement) return
  el.classList.add("is-leaving")
  const onEnd = () => {
    el.removeEventListener("animationend", onEnd)
    el.remove()
  }
  el.addEventListener("animationend", onEnd)
  // 兜底：动画事件未触发时也能移除
  setTimeout(() => el.remove(), 500)
}

/**
 * 显示一条全局消息提示。
 */
export function showMessage(options: MessageOptions | string): void {
  registerMessage()
  const opts: Required<Omit<MessageOptions, "content">> & Pick<MessageOptions, "content"> =
    typeof options === "string"
      ? { content: options, type: "info", duration: 3000, closable: false }
      : {
          content: options.content,
          type: options.type ?? "info",
          duration: options.duration ?? 3000,
          closable: options.closable ?? false,
        }

  const el = document.createElement("div")
  el.className = `ld-message ld-message--${opts.type}`
  el.setAttribute("role", "alert")

  const icon = document.createElement("ld-icon")
  icon.setAttribute("name", TYPE_ICONS[opts.type])
  icon.className = "ld-message__icon"
  el.appendChild(icon)

  const text = document.createElement("span")
  text.className = "ld-message__content"
  text.textContent = opts.content
  el.appendChild(text)

  if (opts.closable) {
    const closeBtn = document.createElement("span")
    closeBtn.className = "ld-message__close"
    const closeIcon = document.createElement("ld-icon")
    closeIcon.setAttribute("name", "close-line")
    closeBtn.appendChild(closeIcon)
    closeBtn.addEventListener("click", () => {
      if (timer !== undefined) clearTimeout(timer)
      close(el)
    })
    el.appendChild(closeBtn)
  }

  getContainer().appendChild(el)

  let timer: number | undefined
  if (opts.duration > 0) {
    timer = window.setTimeout(() => close(el), opts.duration)
  }
}

interface ShortcutInput {
  content: string
  duration?: number
  closable?: boolean
}

function createShortcut(type: MessageType) {
  return (input: string | ShortcutInput) => {
    if (typeof input === "string") {
      showMessage({ content: input, type })
    } else {
      showMessage({ ...input, type })
    }
  }
}

/**
 * 便捷方法集合：message.success / warning / danger / info。
 */
export const message = {
  success: createShortcut("success"),
  warning: createShortcut("warning"),
  danger: createShortcut("danger"),
  info: createShortcut("info"),
}
