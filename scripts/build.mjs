import { execFileSync } from "node:child_process"
import { cp, lstat, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const output = path.resolve(root, "dist")
// Clean only this project's build output, never a linked directory.
if (
  path.relative(root, output) !== "dist" ||
  (await lstat(output).catch(() => null))?.isSymbolicLink()
) {
  throw new Error(`Unsafe build output: ${output}`)
}
await rm(output, { recursive: true, force: true })

function run(script, args) {
  execFileSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    stdio: "inherit",
  })
}

// Preserve ESM module boundaries and leave Lit as a dependency of the consuming app.
run("node_modules/typescript/bin/tsc", ["-p", "tsconfig.build.json"])
await cp(path.join(root, "src/styles"), path.join(output, "styles"), {
  recursive: true,
})
for (const name of await readdir(path.join(root, "src/components"))) {
  await cp(
    path.join(root, "src/components", name, "style.css"),
    path.join(output, "components", name, "style.css"),
  )
}

// Allow strict TypeScript consumers to resolve CSS imports without an ambient wildcard.
async function declareStyles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) await declareStyles(file)
    else if (entry.name.endsWith(".css"))
      await writeFile(`${file}.d.ts`, "export {};\n")
  }
}
await declareStyles(output)

// A separate full bundle is useful for the HTML demo and direct browser usage.
run("node_modules/@rspack/cli/bin/rspack.js", ["build", "--mode", "production"])
