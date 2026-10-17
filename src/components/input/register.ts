import { define } from "../../base.js"
import { LdInput } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register input and its internal dependencies. Safe to call repeatedly. */
export function registerInput(): void {
  registerIcon()
  define("ld-input", LdInput)
}
