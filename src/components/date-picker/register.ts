import { define } from "../../base.js"
import { LdDatePicker } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register date-picker and its internal dependencies. Safe to call repeatedly. */
export function registerDatePicker(): void {
  registerIcon()
  define("ld-date-picker", LdDatePicker)
}
