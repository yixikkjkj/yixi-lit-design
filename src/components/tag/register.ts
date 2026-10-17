import { define } from "../../base.js"
import { LdTag } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register tag and its internal dependencies. Safe to call repeatedly. */
export function registerTag(): void {
  registerIcon()
  define("ld-tag", LdTag)
}
