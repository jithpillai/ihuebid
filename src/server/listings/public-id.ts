import { randomBytes } from "node:crypto";

// URL-safe, unambiguous (no 0/O/1/I/l) alphabet for public listing ids
// (requirements §5: internal UUIDs must never appear in public URLs).
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXY";

export function generateListingPublicId(length = 8): string {
  const bytes = randomBytes(length);
  let id = "";
  for (let i = 0; i < length; i += 1) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}
