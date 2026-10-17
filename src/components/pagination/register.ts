import { define } from "../../base.js"
import { LdPagination } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register pagination and its internal dependencies. Safe to call repeatedly. */
export function registerPagination(): void {
  registerIcon()
  define("ld-pagination", LdPagination)
}
