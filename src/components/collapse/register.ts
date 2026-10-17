import { define } from "../../base.js"
import { LdCollapse, LdCollapseItem } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register collapse and its internal dependencies. Safe to call repeatedly. */
export function registerCollapse(): void {
  registerIcon()
  define("ld-collapse", LdCollapse)
  define("ld-collapse-item", LdCollapseItem)
}
