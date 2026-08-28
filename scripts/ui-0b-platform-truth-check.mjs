import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const tempRoot = mkdtempSync(join(tmpdir(), "askbuddy-ui-0b-"));
const catalogPath = "packages/shared-api/src/rpc-catalog.ts";
const outputPath = join(tempRoot, "rpc-catalog.cjs");
const require = createRequire(import.meta.url);

const transpileCatalog = () => {
  const sourcePath = join(root, catalogPath);
  const output = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], `Transpile failed for ${catalogPath}`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output.outputText);
};

const assertCatalogEntries = (catalog, names, expected) => {
  for (const name of names) {
    assert.ok(catalog[name], `Missing RPC catalog entry: ${name}`);
    for (const [field, value] of Object.entries(expected)) {
      assert.equal(catalog[name][field], value, `${name}.${field} must be ${value}`);
    }
  }
};

try {
  transpileCatalog();
  const { RPC_CATALOG: catalog } = require(outputPath);

  const authenticatedRpcs = [
    "accept_answer_v2",
    "create_question_secure",
    "create_answer_secure",
    "send_direct_message",
    "get_user_conversations",
    "get_my_unread_message_count",
    "get_my_unread_notification_count",
    "mark_notifications_read",
    "upsert_search_history",
    "submit_content_report",
    "create_call_session_v1",
    "accept_call_v1",
    "reject_call_v1",
    "end_call_v1",
  ];
  assertCatalogEntries(catalog, authenticatedRpcs, {
    status: "canonical",
    authentication: "authenticated",
    productionGrantReview: "aligned",
  });

  assertCatalogEntries(catalog, [
    "search_app_content_v2",
    "get_search_suggestions_v2",
    "get_channel_feed",
    "get_nearby_experts",
  ], {
    status: "canonical",
    authentication: "anon",
    productionGrantReview: "aligned",
  });

  assertCatalogEntries(catalog, [
    "create_system_notification_v2",
    "transition_order_status_v2",
    "claim_wechat_identity_v1",
  ], {
    status: "canonical",
    authentication: "service_role",
    productionGrantReview: "aligned",
  });

  const stage3Statuses = {
    accept_answer_and_transfer_points: "deprecated",
    recharge_points: "deprecated",
    create_recharge_payment_order: "blocked",
    create_consultation_order: "blocked",
    create_topic_discussion_secure: "compatibility-only",
    confirm_recharge_payment: "blocked",
  };
  for (const [name, status] of Object.entries(stage3Statuses)) {
    assertCatalogEntries(catalog, [name], {
      status,
      authentication: "service_role",
      productionGrantReview: "aligned",
    });
  }

  for (const name of [
    "admin_confirm_recharge_order",
    "list_pending_recharge_orders",
  ]) {
    assertCatalogEntries(catalog, [name], {
      status: "blocked",
      authentication: "admin",
      productionGrantReview: "server-guarded",
    });
    assert.match(catalog[name].note, /EXECUTE is granted to authenticated and service_role/);
    assert.match(catalog[name].note, /authorization is enforced inside the function/);
  }

  const catalogSource = read(catalogPath);
  assert.doesNotMatch(catalogSource, /Production currently grants anon EXECUTE/);

  for (const name of [
    "review_content_report",
    "apply_content_moderation_action",
    "list_content_reports",
  ]) {
    assert.equal(catalog[name].productionGrantReview, "server-guarded");
  }

  const workflow = read(".github/workflows/ci.yml");
  const setupNodeCount = [...workflow.matchAll(/uses:\s*actions\/setup-node@v4/g)].length;
  const node22Count = [...workflow.matchAll(/node-version:\s*22/g)].length;
  assert.ok(setupNodeCount > 0, "CI must configure Node with actions/setup-node@v4");
  assert.equal(node22Count, setupNodeCount, "Every setup-node@v4 step must use Node 22");
  assert.doesNotMatch(workflow, /node-version:\s*20/);
  assert.match(workflow, /^\s{2}quality-gate:\s*$/m);
  assert.match(workflow, /^\s{4}name:\s*quality-gate\s*$/m);
  const qualityGateStart = workflow.indexOf("  quality-gate:\n");
  const qualityGateEnd = workflow.indexOf("\n  legacy-typecheck-report:", qualityGateStart);
  assert.ok(qualityGateStart >= 0 && qualityGateEnd > qualityGateStart);
  const qualityGate = workflow.slice(qualityGateStart, qualityGateEnd);
  for (const command of [
    "npm ci",
    "npm run typecheck:baseline",
    "npm run lint:changed",
    "npm run test:contracts",
    "npm run test:runtime-mode",
    "npm run build",
  ]) {
    assert.ok(qualityGate.includes(`- run: ${command}`), `quality-gate must retain ${command}`);
  }

  const packageJson = JSON.parse(read("package.json"));
  const packageLock = JSON.parse(read("package-lock.json"));
  assert.equal(packageJson.scripts["test:ui-platform-readiness"],
    "node scripts/ui-0b-platform-truth-check.mjs");
  assert.match(packageJson.scripts["test:contracts"], /ui-0b-platform-truth-check\.mjs/);
  assert.equal(packageJson.engines.node, ">=22");
  assert.equal(packageLock.packages[""].engines.node, ">=22");
  assert.equal(packageLock.packages["node_modules/@capacitor/cli"].engines.node, ">=22.0.0");
  assert.equal(read(".nvmrc").trim(), "22");

  console.log("UI-0b platform truth guards passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
