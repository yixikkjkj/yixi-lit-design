import { define } from "../../base.js"
import { LdTextarea } from "./index.js"

/** Register textarea and its internal dependencies. Safe to call repeatedly. */
export function registerTextarea(): void {
  define("ld-textarea", LdTextarea)
}
