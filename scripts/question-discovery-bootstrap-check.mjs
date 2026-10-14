import assert from "node:assert/strict";
import { withDisposablePostgres, assertDisposableTarget } from "./lib/d1b-disposable-postgres.mjs";
import { regressionCounts, regressionTables } from "./lib/d1a-regression-bootstrap.mjs";

assert.deepEqual(process.argv.slice(2), ["--local"]);
await withDisposablePostgres(async ({ admin }) => {
  await assertDisposableTarget(admin);
  assert.equal(regressionTables.length, 9);
  assert.ok(Object.values(await regressionCounts(admin)).every(n => n === 0));
  console.log("PASS focused D1A disposable dependency/ownership/ACL/RLS/trigger behavior and resolved target gate");
}, { profile: "d1a" });
