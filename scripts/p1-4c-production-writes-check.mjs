import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const collectSourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });

const generatedTypes = join(root, 'src/integrations/supabase/types.ts');
const coreSource = collectSourceFiles(join(root, 'src'))
  .filter((path) => path !== generatedTypes)
  .map((path) => `\n// ${relative(root, path)}\n${readFileSync(path, 'utf8')}`)
  .join('\n');

const questions = read('src/hooks/useQuestions.ts');
assert.match(questions, /rpc\('create_question_secure'/);
assert.match(questions, /rpc\('create_answer_secure'/);
assert.doesNotMatch(questions, /from\('questions'\)[\s\S]{0,240}\.insert\(/);
assert.doesNotMatch(questions, /from\('answers'\)[\s\S]{0,240}\.insert\(/);

const messages = read('src/hooks/useMessages.ts');
assert.match(messages, /rpc\('send_direct_message'/);
assert.doesNotMatch(messages, /from\('messages'\)[\s\S]{0,240}\.insert\(/);

const notifications = read('src/hooks/useNotifications.ts');
assert.match(notifications, /rpc\('mark_notifications_read'/);
assert.doesNotMatch(notifications, /from\('notifications'\)[\s\S]{0,240}\.update\(/);
assert.match(notifications, /body: notification\.body \?\? notification\.content/);
assert.match(notifications, /target_id: notification\.target_id \?\? notification\.related_id/);

const acceptAnswer = read('src/hooks/useAcceptAnswer.ts');
assert.match(acceptAnswer, /rpc\('accept_answer_v2'/);

for (const forbiddenAction of [
  'accept_answer_and_transfer_points',
  'recharge_points',
  'create_recharge_payment_order',
  'create_consultation_order',
  'create_topic_discussion_secure',
]) {
  assert.ok(!coreSource.includes(forbiddenAction), `Core source calls blocked action ${forbiddenAction}`);
}

const payments = read('src/hooks/usePayments.ts');
const recharge = read('src/pages/profile/PointsRecharge.tsx');
assert.match(payments, /PAYMENT_CAPABILITIES/);
assert.match(payments, /PAYMENT_UNAVAILABLE_MESSAGE/);
assert.doesNotMatch(payments, /legacy-|fake-|Date\.now\(\)/);
assert.doesNotMatch(recharge, /充值成功|支付单已创建|setSuccess|paymentIntent/);

const consultation = read('src/pages/ExpertDetail.tsx');
assert.match(consultation, /CONSULTATION_CAPABILITY/);
assert.match(consultation, /CONSULTATION_UNAVAILABLE_MESSAGE/);

const topics = read('src/hooks/useHotTopics.ts');
assert.match(topics, /TOPIC_DISCUSSION_CAPABILITY/);
assert.doesNotMatch(topics, /from\('topic_discussions'\)[\s\S]{0,240}\.insert\(/);

const skillPublish = read('src/pages/SkillPublish.tsx');
const skillOffers = read('src/hooks/useSkillOffers.ts');
assert.doesNotMatch(skillPublish, /useSaveExpertProfile|from\('experts'\)|\.from\("experts"\)/);
assert.match(skillOffers, /from\('skill_offers'\)/);
assert.match(skillOffers, /\.insert\(\{ expert_id: user\.id, \.\.\.payload \}\)/);
assert.match(skillOffers, /\.update\(payload\)/);
assert.match(skillOffers, /\.eq\('expert_id', user\.id\)/);

const chat = read('src/pages/ChatDetail.tsx');
const demoSendBranch = chat.match(/if \(isDemoChat\) \{([\s\S]*?)\n\s*\}/)?.[1] || '';
assert.doesNotMatch(demoSendBranch, /setInputValue\(''\)/);
assert.match(chat, /onSuccess:\s*\(\)\s*=>\s*\{[\s\S]*?setInputValue\(''\)/);

const community = read('src/pages/profile/CommunityChat.tsx');
assert.doesNotMatch(community, /local-|setMessages\(/);
assert.match(community, /当前不可发送/);

const clipboard = read('src/utils/clipboard.ts');
const questionDetail = read('src/pages/QuestionDetail.tsx');
const shareDialog = read('src/components/question/ShareDialog.tsx');
const posts = read('src/hooks/usePosts.ts');
assert.match(clipboard, /await navigator\.clipboard\.writeText\(text\)/);
assert.match(questionDetail, /await copyTextToClipboard\([\s\S]*?分享链接已复制/);
assert.match(shareDialog, /await copyTextToClipboard\([\s\S]*?链接已复制到剪贴板/);
assert.match(posts, /await copyTextToClipboard\([\s\S]*?if \(readError\) throw readError[\s\S]*?if \(error\) throw error/);
assert.match(posts, /onError:[\s\S]*?分享失败/);

console.log('P1.4c production write guards passed.');
