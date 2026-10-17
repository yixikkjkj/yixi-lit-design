import { define } from "../../base.js"
import { LdBackTop } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register back-top and its internal dependencies. Safe to call repeatedly. */
export function registerBackTop(): void {
  registerIcon()
  define("ld-back-top", LdBackTop)
}
