import { define } from "../../base.js"
import { LdIcon } from "./index.js"

/** Register icon and its internal dependencies. Safe to call repeatedly. */
export function registerIcon(): void {
  define("ld-icon", LdIcon)
}
