import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Exact exception for this approved owner-only consumer, not a general Topic UI unlock.
export const ownerTopicFiles = new Set([
  'src/components/experience/ExperienceTopicManager.tsx',
  'src/features/experience/topics/topicApi.ts',
  'src/features/experience/topics/topicSelection.ts',
  'src/features/experience/topics/useOwnerExperienceTopics.ts',
]);
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.posix.join(dir, entry.name);
  if (['node_modules', 'build', '.gradle', 'Pods', 'dist'].includes(entry.name)) return [];
  return entry.isDirectory() ? walk(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
});
export function checkOwnerTopicScope(gatedSymbols) {
  for (const file of [...walk('src'), ...walk('apps')]) {
    if (file === 'src/integrations/supabase/types.ts') continue;
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /canonical-topics\/core-v1\.json/, `${file}: seed is never runtime data`);
    if (!ownerTopicFiles.has(file)) assert.doesNotMatch(source, gatedSymbols, `${file}: only the approved Owner consumer may use Topic APIs`);
    if (file !== 'src/pages/ExperienceEditor.tsx' && !ownerTopicFiles.has(file)) {
      assert.doesNotMatch(source, /ExperienceTopicManager|features\/experience\/topics/, `${file}: no public/new/Question/Discovery hookup`);
    }
  }
  const editor = readFileSync('src/pages/ExperienceEditor.tsx', 'utf8');
  assert.match(editor, /isEdit && existingExperience && existingExperience\.personId === user\.id \? \(\s*<ExperienceTopicManager/);
  assert.match(readFileSync('src/pages/NewQuestion.tsx', 'utf8'), /p_topic_ids: \[\]/);
}
