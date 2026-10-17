import { define } from "../../base.js"
import { LdBreadcrumbItem, LdBreadcrumb } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register breadcrumb and its internal dependencies. Safe to call repeatedly. */
export function registerBreadcrumb(): void {
  registerIcon()
  define("ld-breadcrumb-item", LdBreadcrumbItem)
  define("ld-breadcrumb", LdBreadcrumb)
}
