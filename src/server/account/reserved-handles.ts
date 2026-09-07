// Handles that must never be claimable by a creator, since they collide with
// platform routes or are reserved for future platform use (requirements §5).
export const RESERVED_HANDLES = new Set([
  "admin",
  "api",
  "login",
  "signup",
  "explore",
  "help",
  "pricing",
  "assets",
  "dashboard",
  "account",
  "settings",
  "about",
  "terms",
  "privacy",
  "support",
]);

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle.toLowerCase());
}
