import { define } from "../../base.js"
import { LdLink } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register link and its internal dependencies. Safe to call repeatedly. */
export function registerLink(): void {
  registerIcon()
  define("ld-link", LdLink)
}
