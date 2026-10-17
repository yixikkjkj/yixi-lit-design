import { define } from "../../base.js"
import { LdDrawer } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register drawer and its internal dependencies. Safe to call repeatedly. */
export function registerDrawer(): void {
  registerIcon()
  define("ld-drawer", LdDrawer)
}
