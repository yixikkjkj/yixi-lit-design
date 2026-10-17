import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { rspack } from "@rspack/core"
import config from "../rspack.config.mjs"

const root = fileURLToPath(new URL("../", import.meta.url))
const temporary = await mkdtemp(path.join(root, ".browser-build-test-"))
const registry = new Map()
// BackTop keeps the scroll target on construction; no DOM lifecycle runs here.
globalThis.window = globalThis
// Tabs constructs an observer, but the test never connects elements to a DOM.
globalThis.MutationObserver = class {}
globalThis.customElements = {
  get: (tag) => registry.get(tag),
  define: (tag, ctor) => registry.set(tag, ctor),
}

try {
  for (const mode of ["development", "production"]) {
    // Exercise the demo's actual SWC pipeline. External Lit uses its Node DOM shim
    // so property accessors can be tested without a browser or fake component classes.
    const compiler = rspack({
      ...config,
      mode,
      context: root,
      devServer: undefined,
      devtool: false,
      performance: false,
      externalsType: "module",
      externals: [/^lit(?:\/|$)/],
      output: { ...config.output, path: path.join(temporary, mode) },
    })
    await new Promise((resolve, reject) => {
      compiler.run((error, stats) => {
        compiler.close((closeError) => {
          if (error || closeError) reject(error || closeError)
          else if (stats.hasErrors())
            reject(new Error(stats.toString({ all: false, errors: true })))
          else resolve()
        })
      })
    })
    registry.clear()
    const api = await import(
      pathToFileURL(path.join(temporary, mode, "index.js")).href
    )
    assert.equal(registry.get("ld-button"), api.LdButton)
    let checked = 0
    for (const [tag, Element] of registry) {
      const element = new Element()
      for (const name of Element.elementProperties.keys()) {
        assert.equal(
          Object.hasOwn(element, name),
          false,
          `${mode}: ${tag}.${String(name)} shadows a Lit accessor`,
        )
        checked++
      }
    }
    // Also prove an actual public property assignment reaches Lit's update hook.
    const button = new api.LdButton()
    const updates = []
    button.requestUpdate = (name) => updates.push(name)
    button.variant = "primary"
    assert.ok(
      updates.includes("variant"),
      `${mode}: changing Button.variant must request an update`,
    )
    const password = new api.LdPasswordInput()
    const passwordUpdates = []
    password.requestUpdate = (name) => passwordUpdates.push(name)
    password.value = "secret"
    assert.ok(
      passwordUpdates.includes("value"),
      `${mode}: inherited Input.value must request an update`,
    )

    // Exercise range selection through the same handlers bound to calendar buttons.
    // DOM focus is irrelevant here; real rendering is checked in the demo browser.
    const picker = new api.LdDatePicker()
    picker.querySelector = () => null
    const changes = []
    picker.emit = (name, detail) => changes.push({ name, value: detail.value })
    const day = (year, month, date) => ({
      year,
      month: month - 1,
      day: date,
      current: true,
    })
    picker.range = true
    picker.value = []
    picker.toggleOpen()
    picker.onSelectDay(day(2027, 1, 5))
    assert.equal(
      changes.length,
      0,
      "An unfinished range must not emit a change",
    )
    assert.equal(picker.open, true)
    picker.onSelectDay(day(2026, 12, 26))
    assert.deepEqual(picker.value, ["2026-12-26", "2027-01-05"])
    assert.deepEqual(changes.at(-1), {
      name: "ld-change",
      value: ["2026-12-26", "2027-01-05"],
    })
    assert.equal(picker.open, false)
    picker.toggleOpen()
    picker.onSelectDay(day(2026, 12, 20))
    picker.onKeydown({ key: "Escape", stopPropagation() {} })
    assert.deepEqual(
      picker.value,
      ["2026-12-26", "2027-01-05"],
      "Cancel must preserve the committed range",
    )
    assert.equal(changes.length, 1)
    picker.onClear({ stopPropagation() {} })
    assert.deepEqual(picker.value, [])
    picker.toggleOpen()
    picker.onSelectDay(day(2028, 2, 29))
    picker.onSelectDay(day(2028, 2, 29))
    assert.deepEqual(picker.value, ["2028-02-29", "2028-02-29"])
    picker.disabled = true
    const changeCount = changes.length
    picker.onSelectDay(day(2028, 3, 1))
    picker.onClear({ stopPropagation() {} })
    assert.equal(
      changes.length,
      changeCount,
      "Disabled dates cannot change or clear",
    )
    picker.disabled = false
    picker.range = false
    picker.onSelectDay(day(2026, 10, 17))
    assert.equal(picker.value, "2026-10-17")
    picker.onClear({ stopPropagation() {} })
    assert.equal(picker.value, "")
    picker.value = "2026-02-30"
    assert.deepEqual(
      picker.selectedDates,
      [],
      "Invalid dates must not roll into another month",
    )
    assert.equal(api.LdCard, undefined)
    assert.equal(api.LdDivider, undefined)
    console.log(
      `${mode}: ${registry.size} registered elements, ${checked} reactive properties passed.`,
    )
  }
} finally {
  if (
    path.dirname(temporary) !== path.resolve(root) ||
    !path.basename(temporary).startsWith(".browser-build-test-")
  ) {
    throw new Error("Unsafe test cleanup path")
  }
  await rm(temporary, { recursive: true, force: true })
}
