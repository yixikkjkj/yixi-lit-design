import { define } from "../../base.js"
import { LdButton } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register button and its internal dependencies. Safe to call repeatedly. */
export function registerButton(): void {
  registerIcon()
  define("ld-button", LdButton)
}
