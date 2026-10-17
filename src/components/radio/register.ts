import { define } from "../../base.js"
import { LdRadio, LdRadioGroup } from "./index.js"

/** Register radio and its internal dependencies. Safe to call repeatedly. */
export function registerRadio(): void {
  define("ld-radio", LdRadio)
  define("ld-radio-group", LdRadioGroup)
}
