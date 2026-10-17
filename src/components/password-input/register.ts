import { define } from "../../base.js"
import { LdPasswordInput } from "./index.js"
import { registerInput } from "../input/register.js"

/** Register password-input and its internal dependencies. Safe to call repeatedly. */
export function registerPasswordInput(): void {
  registerInput()
  define("ld-password-input", LdPasswordInput)
}
