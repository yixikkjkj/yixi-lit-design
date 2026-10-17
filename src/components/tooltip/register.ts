import { define } from "../../base.js"
import { LdTooltip } from "./index.js"

/** Register tooltip and its internal dependencies. Safe to call repeatedly. */
export function registerTooltip(): void {
  define("ld-tooltip", LdTooltip)
}
