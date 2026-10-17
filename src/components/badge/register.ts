import { define } from "../../base.js"
import { LdBadge } from "./index.js"

/** Register badge and its internal dependencies. Safe to call repeatedly. */
export function registerBadge(): void {
  define("ld-badge", LdBadge)
}
