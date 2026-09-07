// Idempotent seed script (`pnpm db:seed`). No reference data to seed yet in
// the foundation slice — reserved handles are a static code-level list
// (see src/server/account/reserved-handles.ts), not stored data. Kept as a
// wired-up entry point so future reference data (e.g. seeded demo listings)
// has a home without adding new plumbing.
async function main() {
  console.log("Nothing to seed yet.");
}

main();
