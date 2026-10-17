import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { gzipSync } from "node:zlib"
import { rspack } from "@rspack/core"

const root = fileURLToPath(new URL("../", import.meta.url))
const temporary = await mkdtemp(path.join(root, ".tree-shaking-test-"))

async function bundle(name, source) {
  const entry = path.join(temporary, `${name}.mjs`)
  await writeFile(entry, source)
  const output = path.join(temporary, name)
  const compiler = rspack({
    mode: "production",
    context: root,
    entry,
    output: { path: output, filename: "index.js", module: true },
    experiments: { outputModule: true, css: true },
    module: { rules: [{ test: /\.css$/, type: "css" }] },
    performance: false,
    devtool: false,
  })
  const stats = await new Promise((resolve, reject) => {
    compiler.run((error, result) => {
      compiler.close((closeError) => {
        if (error || closeError) reject(error || closeError)
        else if (result.hasErrors())
          reject(new Error(result.toString({ all: false, errors: true })))
        else resolve(result)
      })
    })
  })
  const js = await readFile(path.join(output, "index.js"), "utf8")
  const css = await readFile(path.join(output, "index.css"), "utf8").catch(
    () => "",
  )
  const activeComponents = new Set()
  function collect(modules = []) {
    for (const module of modules) {
      // Orphan modules may be parsed but never emitted into a chunk.
      if (module.chunks?.length) {
        const matches = (module.name || "").matchAll(
          /dist\/components\/([^/]+)\//g,
        )
        for (const match of matches) activeComponents.add(match[1])
        collectActive(module.modules)
      }
      collect(module.modules)
    }
  }
  function collectActive(modules = []) {
    for (const module of modules) {
      for (const match of (module.name || "").matchAll(
        /dist\/components\/([^/]+)\//g,
      ))
        activeComponents.add(match[1])
      collectActive(module.modules)
    }
  }
  collect(
    stats.toJson({
      all: false,
      modules: true,
      nestedModules: true,
      chunkModules: true,
      ids: true,
    }).modules,
  )
  return { js, css, output, activeComponents }
}

function onlyComponents(result, expected) {
  assert.deepEqual([...result.activeComponents].sort(), [...expected].sort())
}

try {
  const empty = await bundle(
    "unused",
    'import { registerButton } from "yixi-lit-design"; console.log("empty");',
  )
  onlyComponents(empty, [])
  assert.equal(empty.css, "")
  assert.doesNotMatch(
    empty.js,
    /lit-html|lit-element|reactive-element|ld-button|ld-icon/,
  )

  const explicit = await bundle(
    "explicit",
    'import { registerButton } from "yixi-lit-design"; import "yixi-lit-design/styles/button.css"; registerButton();',
  )
  const automatic = await bundle(
    "automatic",
    'import "yixi-lit-design/components/button";',
  )
  for (const result of [explicit, automatic]) {
    onlyComponents(result, ["button", "icon"])
    assert.match(result.js, /ld-button/)
    assert.match(result.js, /ld-icon/)
    assert.doesNotMatch(result.js, /ld-(dialog|drawer|date-picker|select)/)
    assert.match(result.css, /\.ld-btn/)
    assert.match(result.css, /--ld-brand-color/)
    assert.match(result.css, /@font-face/)
    assert.doesNotMatch(
      result.css,
      /\.ld-(dialog|drawer|date-picker|select)[\s.{:#-]/,
    )
    assert.ok(
      (await readdir(result.output)).some((file) => file.endsWith(".woff2")),
      "Icon font assets must be emitted",
    )
  }

  const plain = await bundle(
    "switch",
    'import "yixi-lit-design/components/switch";',
  )
  onlyComponents(plain, ["switch"])
  assert.doesNotMatch(plain.css, /@font-face|\.ri-/)
  assert.equal(
    (await readdir(plain.output)).some((file) => /\.(woff2|ttf)$/.test(file)),
    false,
  )

  const password = await bundle(
    "password",
    'import "yixi-lit-design/components/password-input";',
  )
  onlyComponents(password, ["password-input", "input", "icon"])
  assert.match(password.css, /\.ld-input/)

  const message = await bundle(
    "message",
    'import { message } from "yixi-lit-design"; import "yixi-lit-design/styles/message.css"; message.success("ok");',
  )
  onlyComponents(message, ["message", "icon"])
  assert.match(message.css, /\.ld-message/)
  assert.doesNotMatch(message.css, /\.ld-dialog/)

  const full = await bundle("full", 'import "yixi-lit-design/all";')
  const componentNames = await readdir(path.join(root, "src/components"))
  // Message has no element to register; its unused API can be removed even in /all.
  assert.ok(full.activeComponents.size >= componentNames.length - 1)
  assert.ok(automatic.js.length < full.js.length / 2)
  assert.ok(automatic.css.length < full.css.length)

  // Exercise actual registration without a DOM renderer. Importing the root must do nothing.
  const registry = new Map()
  globalThis.customElements = {
    get: (tag) => registry.get(tag),
    define(tag, ctor) {
      assert.equal(registry.has(tag), false, `Duplicate registration: ${tag}`)
      registry.set(tag, ctor)
    },
  }
  const api = await import(pathToFileURL(path.join(root, "dist/index.js")).href)
  assert.equal(registry.size, 0)
  api.registerButton()
  api.registerButton()
  assert.deepEqual([...registry.keys()].sort(), ["ld-button", "ld-icon"])
  registry.clear()
  api.registerPasswordInput()
  assert.deepEqual([...registry.keys()].sort(), [
    "ld-icon",
    "ld-input",
    "ld-password-input",
  ])
  registry.clear()
  api.registerCheckbox()
  assert.deepEqual([...registry.keys()].sort(), [
    "ld-checkbox",
    "ld-checkbox-group",
    "ld-icon",
  ])
  for (const [name, register] of Object.entries(api)) {
    if (name.startsWith("register")) {
      register()
      register()
    }
  }
  assert.ok(
    registry.has("ld-dialog") &&
      registry.has("ld-option") &&
      registry.has("ld-tab"),
  )

  // Verify the published declarations under strict consumer settings, without src/global.d.ts.
  const typeImports = componentNames
    .map(
      (name) =>
        `import "yixi-lit-design/components/${name}";\nimport "yixi-lit-design/styles/${name}.css";`,
    )
    .join("\n")
  await writeFile(
    path.join(temporary, "consumer.ts"),
    `${typeImports}\nimport "yixi-lit-design/all";\nimport "yixi-lit-design/styles.css";\nimport "yixi-lit-design/styles/common.css";\nimport { registerButton, LdButton } from "yixi-lit-design";\nregisterButton();\nconst button: LdButton = document.createElement("ld-button");\nbutton.variant = "primary";\n`,
  )
  execFileSync(
    process.execPath,
    [
      path.join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--noUncheckedSideEffectImports",
      "--target",
      "ES2021",
      "--module",
      "ESNext",
      "--moduleResolution",
      "bundler",
      "--types",
      "lit",
      path.join(temporary, "consumer.ts"),
    ],
    { cwd: root, stdio: "inherit" },
  )

  console.log(
    "Tree shaking, CSS/assets, dependencies, idempotent registration and consumer types passed.",
  )
  for (const [name, result] of [
    ["button", automatic],
    ["all", full],
  ]) {
    console.log(
      `${name}: JS ${Buffer.byteLength(result.js)} bytes (${gzipSync(result.js).length} gzip), CSS ${Buffer.byteLength(result.css)} bytes (${gzipSync(result.css).length} gzip), fonts excluded`,
    )
  }
} finally {
  if (
    path.dirname(temporary) !== path.resolve(root) ||
    !path.basename(temporary).startsWith(".tree-shaking-test-")
  )
    throw new Error("Unsafe test cleanup path")
  await rm(temporary, { recursive: true, force: true })
}
