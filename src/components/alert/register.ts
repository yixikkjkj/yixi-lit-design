import { define } from "../../base.js"
import { LdAlert } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register alert and its internal dependencies. Safe to call repeatedly. */
export function registerAlert(): void {
  registerIcon()
  define("ld-alert", LdAlert)
}
