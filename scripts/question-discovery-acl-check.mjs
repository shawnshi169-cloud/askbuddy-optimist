import assert from "node:assert/strict";
import { withDisposablePostgres } from "./lib/d1b-disposable-postgres.mjs";

assert.deepEqual(process.argv.slice(2), ["--local"]);
await withDisposablePostgres(() => { throw new Error("Read-only ACL checks must not create a disposable database"); }, { profile: "acl-read-only" });
