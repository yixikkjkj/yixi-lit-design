import { define } from "../../base.js"
import { LdLoading } from "./index.js"

/** Register loading and its internal dependencies. Safe to call repeatedly. */
export function registerLoading(): void {
  define("ld-loading", LdLoading)
}
