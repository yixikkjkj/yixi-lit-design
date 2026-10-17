import { define } from "../../base.js"
import { LdDropdown, LdDropdownItem } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register dropdown and its internal dependencies. Safe to call repeatedly. */
export function registerDropdown(): void {
  registerIcon()
  define("ld-dropdown", LdDropdown)
  define("ld-dropdown-item", LdDropdownItem)
}
