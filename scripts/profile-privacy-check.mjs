import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { auditProfileReads, PUBLIC_PROFILE_COLUMNS } from "./lib/profile-read-boundary.mjs";

const read = (path) => readFileSync(path, "utf8");
const compile = (path, dependencies = {}) => {
  const module = { exports: {} };
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
    fileName: path,
  });
  vm.runInNewContext(output.outputText, { module, exports: module.exports, require: (name) => {
    assert.ok(name in dependencies, `Unexpected import ${name}`);
    return dependencies[name];
  } }, { filename: path });
  return module.exports;
};
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? files(join(dir, entry.name))
    : /\.[cm]?[jt]sx?$/.test(entry.name) ? [join(dir, entry.name)] : []);
let count = 0;
for (const path of files("src")) {
  const result = auditProfileReads(read(path), path);
  assert.deepEqual(result.errors, []);
  count += result.reads;
}
assert.ok(count > 0);
for (const projection of ["*", "phone", "id", "gender", "city_code", "updated_at", "is_verified", "is_expert"]) {
  assert.equal(auditProfileReads(`client.from('profiles').select('${projection}')`).errors.length, 1);
  assert.equal(auditProfileReads(`const p=client.from('profiles'); p.select('${projection}')`).errors.length, 1);
  assert.equal(auditProfileReads(`client.from('posts').select('author:profiles(${projection})')`).errors.length, 1);
}
for (const source of ["client.from('profiles').select()", "client.from('profiles').select(variable)",
  "client.from('profiles').update({nickname:'x'}).eq('user_id',id).select()",
  "client['from']('profiles')['select']('*')"]) {
  assert.equal(auditProfileReads(source).errors.length, 1);
}
assert.equal(auditProfileReads(`client.from('profiles').select('${PUBLIC_PROFILE_COLUMNS.join(",")}')`).errors.length, 0);
assert.equal(auditProfileReads("client.from('posts').select('*')").errors.length, 0);

const { parseGetMyPrivateProfileV1Result: parse } = compile("packages/shared-api/src/private-profile-v1.ts");
const privateProfile = { userId: "11111111-1111-4111-8111-111111111111", nickname: null,
  avatarUrl: null, coverUrl: null, bio: null, phone: null, city: null };
assert.equal(parse({ profile: privateProfile }).profile.userId, privateProfile.userId);
assert.equal(parse({ profile: null }).profile, null);
for (const field of ["id", "is_verified", "is_expert", "verificationStatus", "settings"]) {
  assert.throws(() => parse({ profile: { ...privateProfile, [field]: true } }));
}
assert.throws(() => parse({ profile: { ...privateProfile, userId: "wrong" } }));
assert.throws(() => parse({ profile: { ...privateProfile, phone: 123 } }));
assert.throws(() => parse({ profile: { userId: privateProfile.userId } }));

// Exercise AuthContext's real fetch path: private RPC only, unchanged point-account source.
const states = [];
const authCalls = [];
const react = {
  createContext: () => ({ Provider: {} }),
  useContext: () => undefined,
  useState: (initial) => {
    const index = states.push(initial) - 1;
    return [initial, (value) => { states[index] = value; }];
  },
  useEffect: (effect) => effect(),
};
const profileClient = {
  rpc: async (...args) => {
    assert.deepEqual(args, ["get_my_private_profile_v1"]);
    authCalls.push("owner-private");
    return { data: { profile: privateProfile }, error: null };
  },
  from: (table) => {
    assert.equal(table, "point_accounts");
    return { select: (column) => {
      assert.equal(column, "available_balance");
      return { eq: (key, value) => {
        assert.equal(key, "user_id"); assert.equal(value, privateProfile.userId);
        return { maybeSingle: async () => ({ data: { available_balance: 17 }, error: null }) };
      } };
    } };
  },
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: { user: { id: privateProfile.userId } } } }),
  },
};
const { AuthProvider } = compile("src/contexts/AuthContext.tsx", {
  react: { ...react, default: { createElement: () => null } },
  "@/integrations/supabase/client": { supabase: profileClient },
  "../../packages/shared-api/src/private-profile-v1": { parseGetMyPrivateProfileV1Result: parse },
});
AuthProvider({ children: null });
for (let i = 0; i < 8; i++) await Promise.resolve();
assert.deepEqual(authCalls, ["owner-private"]);
assert.equal(states[2]?.user_id, privateProfile.userId);
assert.equal(states[2]?.available_balance, 17);
assert.equal(Object.hasOwn(states[2], "id"), false);

let updatePayload;
const { useUpdateProfile } = compile("src/hooks/useProfile.ts", {
  "@/features/experience/experienceCache": compile("src/features/experience/experienceCache.ts"),
  "@tanstack/react-query": { useQueryClient: () => ({}), useMutation: (config) => config },
  "@/contexts/AuthContext": { useAuth: () => ({ user: { id: privateProfile.userId }, refreshProfile: async () => {} }) },
  "@/hooks/use-toast": { useToast: () => ({ toast: () => {} }) },
  "@/integrations/supabase/client": { supabase: { from: (table) => {
    assert.equal(table, "profiles");
    const chain = {
      update: (payload) => { updatePayload = payload; return chain; },
      eq: (key, value) => { assert.equal(key, "user_id"); assert.equal(value, privateProfile.userId); return chain; },
      select: (projection) => { assert.equal(projection, "user_id,nickname,avatar_url,cover_url,bio,city"); return chain; },
      single: async () => ({ data: { user_id: privateProfile.userId }, error: null }),
    };
    return chain;
  } } },
});
await useUpdateProfile().mutationFn({ nickname: "local-test", bio: "", city: "", avatar_url: "", cover_url: "", is_verified: true, phone: "forbidden" });
assert.deepEqual(Object.keys(updatePayload).sort(), ["avatar_url", "bio", "city", "cover_url", "nickname"]);

// Exercise the actual Search queryFn with transport mocks, not just string assertions.
const runtime = compile("src/config/runtimeModeCore.ts");
for (const mode of ["production", "staging", "development"]) {
  const calls = [];
  let fallbackEnabled = true;
  const missing = new Error("public.search_app_content_v2 is absent from schema cache");
  const client = {
    rpc: async (name) => {
      calls.push(`rpc:${name}`);
      assert.equal(name, "search_app_content_v2");
      return fallbackEnabled ? { error: missing, data: null }
        : { error: null, data: { questions: [], experts: [], skills: [], posts: [] } };
    },
    from: (table) => {
      calls.push(`table:${table}`);
      const chain = new Proxy({}, { get: (_, name) => {
        if (name === "then") return (resolve) => resolve({ data: [], error: null });
        return (...args) => {
          if (table === "profiles" && name === "select") assert.equal(args[0], "user_id, nickname, avatar_url");
          return chain;
        };
      } });
      return chain;
    },
  };
  const { useSearch } = compile("src/hooks/useSearch.ts", {
    "@tanstack/react-query": { useQuery: (config) => config },
    "@/integrations/supabase/client": { supabase: client },
    "@/lib/demoData": { demoExperts: [], demoQuestions: [], demoTopics: [] },
    "@/lib/adapters/contentAdapters": { mergeUniqueById: (real) => real },
    "@/config/runtimeMode": {
      isPresentationFixtureAllowed: () => false,
      isRuntimeCapabilityAllowed: (capability) => runtime.isRuntimeCapabilityAllowedForMode(capability, mode),
    },
  });
  if (mode === "production") {
    await assert.rejects(useSearch("privacy").queryFn);
    assert.deepEqual(calls, ["rpc:search_app_content_v2"]);
  } else {
    await useSearch("privacy").queryFn();
    assert.ok(calls.includes("table:profiles"));
    assert.equal(calls.filter((call) => call.startsWith("rpc:")).length, 1);
  }
  calls.length = 0;
  fallbackEnabled = false;
  await useSearch("privacy").queryFn();
  assert.deepEqual(calls, ["rpc:search_app_content_v2"], "V2 success never enters fallback");
}

const auth = read("src/contexts/AuthContext.tsx");
assert.doesNotMatch(auth, /\.from\(['"]profiles['"]\)/);
assert.match(auth, /rpc\('get_my_private_profile_v1'\)/);
assert.match(auth, /profileData.userId !== userId/);
const update = read("src/hooks/useProfile.ts");
assert.doesNotMatch(update, /updated_at|\.select\(\s*\)/);
const migration = read("supabase/migrations/20261007005206_public_person_privacy_cutover.sql");
assert.match(migration, /get_my_private_profile_v1\(\)/);
assert.match(migration, /STABLE\s+SECURITY DEFINER\s+SET search_path = ''/);
assert.match(migration, /v_user_id uuid := auth.uid\(\)/);
assert.match(migration, /IF v_user_id IS NULL THEN/);
assert.match(migration, /WHERE p.user_id = v_user_id/);
assert.doesNotMatch(migration, /GRANT ALL|CREATE POLICY|ALTER POLICY|DISABLE ROW|EXECUTE\s+format|p\.id\b/);
assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT UPDATE \(nickname, avatar_url, cover_url, bio, city\)/);
const selectGrant = migration.match(/GRANT SELECT \(([\s\S]*?)\) ON TABLE public.profiles/)[1];
assert.deepEqual(selectGrant.split(",").map((column) => column.trim()), PUBLIC_PROFILE_COLUMNS);
assert.doesNotMatch(read("src/hooks/useSearch.ts"), /rpc\(['"]search_app_content['"]/);
const catalog = compile("packages/shared-api/src/rpc-catalog.ts").RPC_CATALOG;
const whitelist = compile("packages/shared-api/src/rpc-whitelist.ts", { "./rpc-catalog": { RPC_CATALOG: catalog } }).CLIENT_RPC_WHITELIST;
assert.equal(catalog.get_my_private_profile_v1.authentication, "authenticated");
assert.equal(catalog.get_my_private_profile_v1.productionGrantReview, "aligned");
assert.equal(whitelist.get_my_private_profile_v1, "public.get_my_private_profile_v1");
console.log(`Profile privacy checks passed: ${count} explicit safe client projections; owner parser; Search V2/fallback boundary.`);
