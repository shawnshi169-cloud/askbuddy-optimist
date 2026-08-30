import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const searchPage = read('src/pages/SearchResults.tsx');
const searchBar = read('src/components/SearchBar.tsx');
const tabs = read('src/components/search/SearchResultTabs.tsx');
const items = read('src/components/search/SearchResultItems.tsx');
const sheet = read('src/components/ui/sheet.tsx');
const bottomNav = read('src/components/BottomNav.tsx');

assert.match(tabs, /label: '综合'/);
assert.match(tabs, /label: '问题'/);
assert.match(tabs, /label: '人'/);
assert.match(tabs, /label: '动态'/);
assert.match(tabs, /label: '服务'/);
assert.doesNotMatch(tabs, /label: '专家'|label: '技能'|label: '(?:综合|问题|人|动态|服务)\(/);

assert.match(searchPage, /navigate\(`\/expert-profile\/\$\{id\}`/);
assert.doesNotMatch(searchPage, /navigate\(`\/expert\/\$\{/);
assert.doesNotMatch(searchPage, /label: '最热'|aHot|bHot/);
assert.doesNotMatch(searchPage, /<Bell|相关专家|去找专家|让专家看到|擅长经验答疑与实战建议/);
assert.match(searchPage, /title="可能懂的人"/);
assert.match(searchPage, /title="相关分享"/);
assert.match(searchPage, /title="相关服务"/);
assert.match(searchPage, /source !== 'related' && !lower\.includes\(keyword\)/);

assert.doesNotMatch(items, /verification_status|已核验|已认证|立即咨询|立即购买|擅长经验答疑与实战建议/);
assert.doesNotMatch(items, /price_amount|price_currency/);

const postItem = items.slice(items.indexOf('export const SearchPostItem'), items.indexOf('export const SearchServiceItem'));
const serviceItem = items.slice(items.indexOf('export const SearchServiceItem'));
assert.doesNotMatch(postItem, /onClick=/);
assert.doesNotMatch(serviceItem, /onClick=/);

assert.match(searchBar, /'searchPage'/);
assert.match(searchBar, /aria-label="清除搜索内容"/);
assert.match(searchBar, /h-11 w-11/);

assert.match(sheet, /SheetPrimitive\.Close className="[^"]*h-11 w-11[^"]*"/);
assert.match(sheet, /<X className="h-4 w-4"/);
assert.match(sheet, /<span className="sr-only">关闭<\/span>/);
assert.doesNotMatch(sheet, /flex flex-col space-y-2 pr-14/);
assert.match(bottomNav, /<SheetHeader className="pr-14 text-left">/);

console.log('UI-1C Search truth checks passed.');
