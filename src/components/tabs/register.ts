import { define } from "../../base.js"
import { LdTab, LdTabs } from "./index.js"

/** Register tabs and its internal dependencies. Safe to call repeatedly. */
export function registerTabs(): void {
  define("ld-tab", LdTab)
  define("ld-tabs", LdTabs)
}
