import { define } from "../../base.js"
import { LdAvatar, LdAvatarGroup } from "./index.js"
import { registerIcon } from "../icon/register.js"

/** Register avatar and its internal dependencies. Safe to call repeatedly. */
export function registerAvatar(): void {
  registerIcon()
  define("ld-avatar", LdAvatar)
  define("ld-avatar-group", LdAvatarGroup)
}
