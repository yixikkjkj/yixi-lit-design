import { define } from "../../base.js"
import { LdDialog } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register dialog and its internal dependencies. Safe to call repeatedly. */
export function registerDialog(): void {
  registerIcon()
  define("ld-dialog", LdDialog)
}
