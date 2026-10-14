// TEST ONLY loopback worker. Secrets arrive through private IPC, never argv/env/files.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { createLocalJWKSet } from "jose";
import { isolatedPool } from "./d1b-disposable-postgres.mjs";

assert.ok(process.send, "TEST ONLY: fork with a private IPC channel required");
process.once("message", async options => {
  let server, caller, operational;
  const stop = async () => {
    if (server) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
    if (caller) await caller.end();
    if (operational) await operational.end();
  };
  try {
    assert.ok(resolve(options.compiled).startsWith(join(process.cwd(), "node_modules/.d1b-local-")));
    const require = createRequire(import.meta.url);
    const api = Object.assign({}, ...["auth", "database", "security", "store", "http"].map(name =>
      require(join(options.compiled, `local-backend/question-discovery-transport-v1/${name}.js`))));
    let now = options.now; const clock = () => now;
    caller = isolatedPool(options.config, "authenticator", 2);
    operational = isolatedPool(options.operationalConfig, "d1b_operations", 2);
    const keys = new api.KeyRing(options.keys, clock);
    // Explicit test issuer and account-lookup double, NOT a Supabase Auth session.
    const verifier = new api.SupabaseJwtVerifier(options.issuer, async (_token, id) => options.users.includes(id),
      { now: clock, localTestKeys: createLocalJWKSet({ keys: [options.jwk] }) });
    const adapter = new api.DiscoveryHttpAdapter(verifier, new api.CallerDatabase(caller),
      api.OperationalStore.postgres(operational, keys), keys, options.origin, clock);
    server = createServer({ maxHeaderSize: 16384, requestTimeout: 6000, headersTimeout: 6000 }, async (req, res) => {
      try {
        const request = new Request(`http://127.0.0.1${req.url}`, { method: req.method, headers: req.headers,
          ...(req.method === "POST" ? { body: req, duplex: "half" } : {}) });
        const response = await adapter.handle(request, api.fingerprint(req.socket.remoteAddress));
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
      } catch { res.writeHead(500); res.end(); }
    });
    await new Promise(r => server.listen(0, "127.0.0.1", r));
    process.send({ ready: true, pid: process.pid, port: server.address().port });
    process.on("message", async message => {
      if (message.command === "clock") { now = message.now; process.send({ clock: now }); }
      if (message.command === "stop") { await stop(); process.disconnect(); }
    });
  } catch {
    await stop(); process.send({ failed: "D1B_WORKER_FAILED (details withheld)" }); process.disconnect();
    process.exitCode = 1;
  }
});
