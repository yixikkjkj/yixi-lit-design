import { define } from "../../base.js"
import { LdAnchorLink, LdAnchor } from "./index.js"

/** Register anchor and its internal dependencies. Safe to call repeatedly. */
export function registerAnchor(): void {
  define("ld-anchor-link", LdAnchorLink)
  define("ld-anchor", LdAnchor)
}
