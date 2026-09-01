import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveOptionalRows } from '../src/hooks/questionDetailEnrichment.ts';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const page = read('src/pages/QuestionDetail.tsx');
const answers = read('src/components/question/AnswerList.tsx');
const answerDialog = read('src/components/AnswerDialog.tsx');
const bottomBar = read('src/components/question/BottomBar.tsx');
const questions = read('src/hooks/useQuestions.ts');
const moderation = read('src/hooks/useModeration.ts');
const sheet = read('src/components/ui/sheet.tsx');

assert.match(page, /<SubPageHeader[\s\S]{0,220}variant="content"/);
assert.match(page, /question\.view_count \?\? 0[\s\S]{0,40}人看过/);
assert.match(page, /answers\.length[\s\S]{0,40}个回答/);
assert.match(page, /question\.bounty_points > 0/);
assert.match(page, /await copyTextToClipboard\(window\.location\.href\)/);
assert.match(page, /createAnswer\.mutate\(/);
assert.match(page, /navigate\(`\/expert-profile\/\$\{expertId\}`/);
assert.match(page, /useSubmitContentReport/);
assert.match(page, /targetId: question\.id[\s\S]{0,80}targetType: 'question'/);
assert.match(page, /variant="ghost"[\s\S]{0,260}aria-label="举报问题"/);
assert.match(page, /展示数据不会提交举报/);
assert.doesNotMatch(page, /专家回答|咨询专家|按热度排序|回复功能暂未开放|handleReply|SHARE_OPTIONS|邀请回答/);
assert.doesNotMatch(page, /error\.message|surface-card|rounded-3xl/);

assert.match(answers, /expertId: string \| null/);
assert.match(answers, /answer\.expertId \?/);
assert.match(answers, /onOpenPerson\(answer\.expertId!\)/);
assert.match(answers, /已采纳/);
assert.doesNotMatch(answers, /\bEye\b|viewCount|onReply|回复|评分|订单|咨询|已核验|已认证/);
assert.doesNotMatch(answers, /surface-card|rounded-3xl|shadow/);

assert.match(questions, /\.from\('experts'\)[\s\S]{0,120}\.select\('id, user_id, headline'\)/);
assert.match(questions, /Promise\.allSettled/);
assert.match(questions, /resolveOptionalRows\(expertsResult\)/);
assert.doesNotMatch(questions, /if \(expertsResult(?:\.value)?\.error\) throw/);
assert.match(questions, /expert_id: expert\?\.id \|\| null/);
assert.match(questions, /expert_headline: expert\?\.headline \|\| null/);
assert.match(questions, /answer\.author_id \|\| answer\.user_id/);
assert.doesNotMatch(questions, /\.order\('likes_count'/);
assert.match(questions, /\.order\('is_accepted',[\s\S]{0,120}\.order\('created_at'/);

const createAnswerStart = questions.indexOf('export const useCreateAnswer');
const toggleFavoriteStart = questions.indexOf('export const useToggleFavorite');
const createAnswer = questions.slice(createAnswerStart, toggleFavoriteStart);
assert.match(createAnswer, /rpc\('create_answer_secure'/);
assert.match(createAnswer, /回答暂时无法提交，请稍后重试/);
assert.doesNotMatch(createAnswer, /description: error\.message/);

assert.match(moderation, /rpc\('submit_content_report'/);
assert.match(moderation, /举报暂时无法提交，请稍后重试/);
assert.doesNotMatch(moderation, /description: error\.message/);

const expertRow = { id: 'expert-id', user_id: 'user-id', headline: '真实简介' };
assert.deepEqual(resolveOptionalRows({
  status: 'fulfilled',
  value: { data: [expertRow], error: null },
}), [expertRow]);
assert.deepEqual(resolveOptionalRows({
  status: 'fulfilled',
  value: { data: null, error: new Error('optional query unavailable') },
}), []);
assert.deepEqual(resolveOptionalRows({
  status: 'rejected',
  reason: new Error('optional query rejected'),
}), []);

assert.match(answerDialog, /<SheetContent[\s\S]{0,80}side="bottom"/);
assert.match(answerDialog, /submitting\?: boolean/);
assert.match(answerDialog, /disabled=\{!message\.trim\(\) \|\| submitting\}/);
assert.match(answerDialog, /type="submit"[\s\S]{0,100}variant="action"/);
assert.doesNotMatch(answerDialog, /timeSlots|预约|服务|咨询|gradient/);
assert.match(sheet, /h-11 w-11[\s\S]{0,420}<X className="h-4 w-4"/);
assert.match(sheet, /<span className="sr-only">关闭<\/span>/);

assert.match(bottomBar, /我也来回答/);
assert.match(bottomBar, /variant="action"/);
assert.doesNotMatch(bottomBar, /邀请回答|gradient/);

console.log('UI-1D Question Detail truth checks passed.');
