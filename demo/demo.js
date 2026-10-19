import { message } from "../dist/browser/index.js"

// Shared by the Message examples' inline handlers.
window.__msg = (type) => message[type]("这是一条" + type + "提示")

const themeSwitch = document.getElementById("theme-switch")
themeSwitch.addEventListener("ld-change", (event) => {
  document.documentElement.dataset.ldTheme = event.detail.checked ? "dark" : ""
})
const syncTheme = () => {
  themeSwitch.checked = document.documentElement.dataset.ldTheme === "dark"
}
new MutationObserver(syncTheme).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-ld-theme"],
})
syncTheme()
await themeSwitch.updateComplete
themeSwitch
  .querySelector('[role="switch"]')
  ?.setAttribute("aria-label", "深色模式")

const links = [...document.querySelectorAll(".nav-link")]
const groups = [...document.querySelectorAll(".nav-group")]
const search = document.getElementById("component-search")
search.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase()
  let count = 0
  for (const link of links) {
    link.hidden = !`${link.textContent} ${link.hash.slice(1)}`
      .toLowerCase()
      .includes(query)
    if (!link.hidden) count++
  }
  for (const group of groups) {
    let sibling = group.nextElementSibling
    let visible = false
    while (sibling && !sibling.classList.contains("nav-group")) {
      if (!sibling.hidden) visible = true
      sibling = sibling.nextElementSibling
    }
    group.hidden = !visible
  }
  document.getElementById("search-empty").hidden = count > 0
})

search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") links.find((link) => !link.hidden)?.click()
})

const sections = [...document.querySelectorAll(".component-section")]
let scheduled = false
function syncCurrent() {
  scheduled = false
  let current = null
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 140) current = section.id
    else break
  }
  for (const link of links) {
    if (link.hash === `#${current}`)
      link.setAttribute("aria-current", "location")
    else link.removeAttribute("aria-current")
  }
}
window.addEventListener(
  "scroll",
  () => {
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(syncCurrent)
    }
  },
  { passive: true },
)
syncCurrent()

// Supplementary JS snippets also get their own copy button.
for (const pre of document.querySelectorAll(".component-section > pre")) {
  const wrapper = document.createElement("div")
  wrapper.className = "example-code"
  const toolbar = document.createElement("div")
  toolbar.className = "code-toolbar"
  toolbar.innerHTML =
    '<span>用法与数据格式</span><button type="button" class="copy-code">复制代码</button>'
  pre.before(wrapper)
  wrapper.append(toolbar, pre)
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-code")
  if (!button) return
  const code = button.closest(".example-code").querySelector("code")
  try {
    await navigator.clipboard.writeText(code.textContent)
    button.textContent = "已复制"
    document.getElementById("copy-status").textContent = "示例代码已复制"
    setTimeout(() => {
      button.textContent = "复制代码"
    }, 1800)
  } catch {
    const range = document.createRange()
    range.selectNodeContents(code)
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    document.getElementById("copy-status").textContent =
      "代码已选中，请按 Ctrl+C 或 Command+C 复制"
    button.textContent = "请手动复制"
  }
})

for (const example of document.querySelectorAll(".example")) {
  const result = document.createElement("p")
  result.className = "event-result"
  result.setAttribute("aria-live", "polite")
  result.hidden = true
  example.querySelector(".demo-preview").after(result)
  for (const name of ["ld-change", "ld-select", "ld-size-change"]) {
    example.addEventListener(name, (event) => {
      // Keep password values out of the visible event preview.
      if (event.target.closest("ld-password-input")) return
      result.hidden = false
      result.textContent = `${name} → ${JSON.stringify(event.detail)}`
    })
  }
}

document.getElementById("demo-scroll-down").addEventListener("ld-click", () => {
  window.scrollBy({ top: 400, behavior: "smooth" })
})

document.getElementById("date-range").addEventListener("ld-change", (event) => {
  document.getElementById("date-range-result").textContent = event.detail.value
    .length
    ? `已选择：${event.detail.value[0]} 至 ${event.detail.value[1]}`
    : "已清空区间"
})

// Recompute after fonts and initial component rendering settle, including hash links.
await document.fonts.ready
if (location.hash)
  document.getElementById(location.hash.slice(1))?.scrollIntoView()
syncCurrent()
