import { define } from "../../base.js"
import { LdCheckbox, LdCheckboxGroup } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register checkbox and its internal dependencies. Safe to call repeatedly. */
export function registerCheckbox(): void {
  registerIcon()
  define("ld-checkbox", LdCheckbox)
  define("ld-checkbox-group", LdCheckboxGroup)
}
