import { define } from "../../base.js"
import { LdSwitch } from "./index.js"

/** Register switch and its internal dependencies. Safe to call repeatedly. */
export function registerSwitch(): void {
  define("ld-switch", LdSwitch)
}
