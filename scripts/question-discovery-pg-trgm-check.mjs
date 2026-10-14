import assert from "node:assert/strict";
import { withDisposablePostgres, assertDisposableTarget } from "./lib/d1b-disposable-postgres.mjs";
import { canonicalCatalog, canonicalManifest } from "./lib/d1b-canonical-bootstrap.mjs";
import { regressionManifest, regressionCounts } from "./lib/d1a-regression-bootstrap.mjs";

assert.deepEqual(process.argv.slice(2), ["--local"]);
await withDisposablePostgres(async ({ admin }) => {
  await assertDisposableTarget(admin);
  assert.ok(Object.values(await regressionCounts(admin)).every(count => count === 0));
  const canonical = await canonicalCatalog(admin, canonicalManifest);
  const projection = await canonicalCatalog(admin, regressionManifest);
  assert.equal(canonical.tables.length, 5); assert.equal(projection.tables.length, 3);
  console.log("PASS focused disposable pg_trgm installation/index parity; all restored business fixture tables empty; full bootstrap behavior remains a separate gate");
}, { profile: "trgm" });
