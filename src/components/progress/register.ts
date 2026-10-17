import { define } from "../../base.js"
import { LdProgress } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register progress and its internal dependencies. Safe to call repeatedly. */
export function registerProgress(): void {
  registerIcon()
  define("ld-progress", LdProgress)
}
