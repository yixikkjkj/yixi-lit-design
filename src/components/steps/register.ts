import { define } from "../../base.js"
import { LdStep, LdSteps } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register steps and its internal dependencies. Safe to call repeatedly. */
export function registerSteps(): void {
  registerIcon()
  define("ld-step", LdStep)
  define("ld-steps", LdSteps)
}
