import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import configFactory from '../visual-preview/ux1a/vite.config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const preview = 'visual-preview/ux1a/';
const allowedFiles = new Set([
  preview + 'main.tsx', preview + 'samples.ts', preview + 'preview.css',
  'src/index.css', 'src/lib/utils.ts', 'src/components/ui2/AppSurface.tsx',
  'src/components/common/PageStateCard.tsx', 'src/components/ui/button.tsx',
  'src/components/ui/sheet.tsx', 'src/components/ui/dropdown-menu.tsx',
  'src/components/experience/PersonExperienceCard.tsx',
  'src/components/experience/ExperienceTransitionPath.tsx',
  'src/components/experience/experiencePresentation.ts',
  'packages/shared-types/src/product-channels.ts',
]);
const allowedPackages = new Set([
  'react', 'react-dom/client', 'react-router-dom', 'lucide-react',
  '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-slot',
  'class-variance-authority', 'clsx', 'tailwind-merge',
]);
const text = path => readFileSync(resolve(root, path), 'utf8');
const files = directory => readdirSync(resolve(root, directory), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? files(directory + '/' + entry.name) : [directory + '/' + entry.name]);
function resolveImport(from, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) {
    assert(allowedPackages.has(specifier), 'Unreviewed preview package: ' + specifier);
    return null;
  }
  const absolute = specifier.startsWith('@/')
    ? resolve(root, 'src', specifier.slice(2))
    : resolve(root, dirname(from), specifier);
  const resolved = ['', '.ts', '.tsx'].map(ext => absolute + ext).find(existsSync);
  assert(resolved, 'Missing preview import: ' + specifier);
  const path = relative(root, resolved);
  assert(allowedFiles.has(path), 'Unreviewed preview module: ' + path);
  return path;
}
const visited = new Set();
function inspect(path) {
  if (visited.has(path)) return;
  visited.add(path);
  const source = text(path);
  if (path.endsWith('.css')) {
    assert(!/@import|url\s*\(/i.test(source), 'No preview external CSS assets');
    return;
  }
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.isTypeOnly || node.importClause?.isTypeOnly) return;
      if (node.moduleSpecifier) {
        assert(ts.isStringLiteral(node.moduleSpecifier), 'Literal imports only');
        const next = resolveImport(path, node.moduleSpecifier.text);
        if (next) inspect(next);
      }
    }
    if (ts.isCallExpression(node)) {
      assert(node.expression.kind !== ts.SyntaxKind.ImportKeyword, 'No dynamic imports');
    }
    if (ts.isIdentifier(node)) {
      assert(!['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon',
        'localStorage', 'sessionStorage', 'indexedDB', 'supabase', 'createClient',
        'Worker', 'eval'].includes(node.text), 'No preview IO API: ' + node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
inspect(preview + 'main.tsx');
assert.deepEqual([...visited].sort(), [...allowedFiles].sort(), 'Review exact presentation-only runtime closure');
assert.throws(() => resolveImport(preview + 'main.tsx', '@/integrations/supabase/client'), /Unreviewed/);
assert.throws(() => resolveImport(preview + 'main.tsx', '@supabase/supabase-js'), /Unreviewed/);
assert.throws(() => resolveImport(preview + 'main.tsx', '@/contexts/AuthContext'), /Unreviewed/);
for (const env of [
  { command: 'build', mode: 'development' },
  { command: 'serve', mode: 'production' },
  { command: 'serve', mode: 'staging' },
  { command: 'serve', mode: 'development', isPreview: true },
]) assert.throws(() => configFactory(env), /UX1A_DEV_ONLY/);
const config = configFactory({ command: 'serve', mode: 'development' });
assert.equal(config.envDir, false);
assert.equal(config.publicDir, false);
assert.equal(config.server.host, '127.0.0.1');
assert.equal(config.server.port, 4178);
assert.equal(config.server.strictPort, true);
assert.match(config.server.headers['Content-Security-Policy'], /connect-src ws:\/\/127.0.0.1:4178;/);
const isolation = config.plugins.find(plugin => plugin.name === 'ux1a-loopback-only');
isolation.configResolved(config);
assert.throws(() => isolation.configResolved({ server: { ...config.server, host: '0.0.0.0' } }), /UX1A_LOOPBACK_ONLY/);
for (const path of [...files('src'), ...files('packages')].filter(path => /\.(ts|tsx|css)$/.test(path))) {
  assert(!text(path).includes('visual-preview/ux1a'), 'No production import of preview: ' + path);
}
assert(!text('vite.config.ts').includes('ux1a'), 'Normal build configuration unchanged');
assert(!text('index.html').includes('ux1a'), 'Normal HTML excludes preview');
assert.match(text(preview + 'main.tsx'), /!import\.meta\.env\.DEV/);
assert.match(text(preview + 'main.tsx'), /UX-1A 设计预览 \/ 非真实平台数据/);
assert.match(text(preview + 'main.tsx'), /频道发现尚未接入/);
assert.match(text(preview + 'main.tsx'), /搜索能力尚未接入/);
if (process.argv.includes('--built')) {
  assert(existsSync(resolve(root, 'dist/index.html')), 'Run the normal production build first');
  for (const path of files('dist')) {
    if (/\.(js|css|html|map|json)$/.test(path)) {
      assert(!/UX1A-R1|ux-home-intro|UX1A_DEV_ONLY|UX-1A 设计预览/.test(text(path)), 'Preview leaked into build: ' + path);
    }
    assert(!/visual-preview|ux1a/i.test(path), 'No preview artifact in normal build');
  }
  console.log('PASS UX1A normal production bundle exclusion');
}
console.log('PASS UX1A: exact 14-file presentation closure; no API/Auth/storage imports; mode/host/CSP boundaries; no production entry import');
