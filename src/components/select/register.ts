import { define } from "../../base.js"
import { LdOption, LdSelect } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register select and its internal dependencies. Safe to call repeatedly. */
export function registerSelect(): void {
  registerIcon()
  define("ld-option", LdOption)
  define("ld-select", LdSelect)
}
