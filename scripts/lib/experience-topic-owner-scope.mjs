import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Exact exceptions for owner linking and public read-only display, not a general Topic UI unlock.
export const ownerTopicFiles = new Set([
  'src/components/experience/ExperienceTopicManager.tsx',
  'src/features/experience/topics/topicApi.ts',
  'src/features/experience/topics/topicSelection.ts',
  'src/features/experience/topics/useOwnerExperienceTopics.ts',
]);
export const publicTopicFiles = new Set([
  'src/components/experience/PublicExperienceTopics.tsx',
  'src/features/experience/topics/publicTopicApi.ts',
  'src/features/experience/topics/publicTopicQuery.ts',
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
    if (!ownerTopicFiles.has(file) && !publicTopicFiles.has(file)) assert.doesNotMatch(source, gatedSymbols, `${file}: only approved owner/public Experience consumers may use Topic APIs`);
    if (publicTopicFiles.has(file)) {
      assert.doesNotMatch(source, /set_experience_topics_v1|resolve_canonical_topic_v1|question_topics_v1|canonical_topic_terms_v1|get_my_person_experiences_v1|readLinkedTopics|ownerTopicKeys|useMutation|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\/topic\//, `${file}: public display is read-only, no owner data or detail navigation`);
    }
    if (file !== 'src/pages/ExperienceEditor.tsx' && !ownerTopicFiles.has(file) && !publicTopicFiles.has(file)) {
      assert.doesNotMatch(source, /ExperienceTopicManager|features\/experience\/topics/, `${file}: no public/new/Question/Discovery hookup`);
    }
    if (file !== 'src/pages/PublicPerson.tsx' && !publicTopicFiles.has(file)) {
      assert.doesNotMatch(source, /PublicExperienceTopics/, `${file}: public Topic entry only on canonical PublicPerson list`);
    }
  }
  const editor = readFileSync('src/pages/ExperienceEditor.tsx', 'utf8');
  assert.match(editor, /isEdit && existingExperience && existingExperience\.personId === user\.id \? \(\s*<ExperienceTopicManager/);
  assert.match(readFileSync('src/pages/NewQuestion.tsx', 'utf8'), /p_topic_ids: \[\]/);
  const person = readFileSync('src/pages/PublicPerson.tsx', 'utf8');
  assert.match(person, /usePublicPersonExperiences\(personId, Boolean\(person\)\)/);
  assert.match(person, /experiences\.map\(\(experience\) => \([\s\S]*?publicTopics=\{<PublicExperienceTopics experience=\{experience\}/);
  assert.doesNotMatch(person, /useMyPersonExperiences|readLinkedTopics|useOwnerExperienceTopics|useMutation/);
  assert.match(readFileSync('src/components/experience/PersonExperienceCard.tsx', 'utf8'), /!ownerMode && visibility === 'public' \? publicTopics : null/);
}
