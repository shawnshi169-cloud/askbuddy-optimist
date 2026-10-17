// Opt-in browser QA only. Uses an existing local Playwright installation; no downloads.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

assert(process.argv.includes('--local'), 'Explicit --local is required');
const { chromium } = await import(process.env.UX1A_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const capture = process.argv.includes('--capture');
const origin = 'http://127.0.0.1:4178';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.UX1A_CHROME_PATH ? { executablePath: process.env.UX1A_CHROME_PATH } : {}),
});
const results = { revision: 'UX1A-R1', data: 'synthetic presentation only', browser: browser.version(),
  testedAt: new Date().toISOString(), matrices: [], screenshots: [], checks: [], requests: [] };
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      failures.push('External request: ' + url.origin);
      return route.abort();
    }
    assert(!/\/(auth|rest|functions)\/v1\//.test(url.pathname), 'No API calls');
    const path = decodeURIComponent(url.pathname).replace('/@fs' + root + '/', '/@repo/');
    assert(!path.startsWith('/@fs/'), 'No unreviewed filesystem module');
    results.requests.push(path);
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  const visit = async path => {
    await page.goto(origin + '/#' + path);
    // Hash navigation keeps component state; each matrix cell needs a fresh document.
    await page.reload();
    await page.locator('.ux-review-bar').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.ux-lab-controls select').waitFor();
  };
  const shot = async (name, path, fullPage = false) => {
    if (!capture) return;
    const filename = name + '.jpg';
    await page.screenshot({ path: resolve(root, 'docs/visual-evidence/ux1a', filename), type: 'jpeg', quality: 76, fullPage });
    results.screenshots.push({ file: filename, viewport: page.viewportSize(), path, fullPage, data: results.data, revision: results.revision });
  };
  const scenes = [
    '/', '/?mode=people', '/?state=loading', '/?state=empty', '/?state=error',
    '/question', '/question?state=loading', '/question?state=empty', '/question?state=error',
    '/question?state=missing', '/question?state=closed', '/question?state=long', '/question?state=partial',
    '/person', '/person?state=empty', '/person?state=loading', '/person?state=error',
    '/person?state=missing', '/person?state=long', '/person?state=partial',
    '/search', '/channel/education-learning', '/channel/career-development',
    '/channel/lifestyle-services', '/channel/hobbies-skills',
  ];
  for (const width of [320, 375, 390, 430, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of scenes) {
      await visit(path);
      const layout = await page.evaluate(() => {
        const visible = element => {
          const box = element.getBoundingClientRect();
          return box.width && box.height && getComputedStyle(element).visibility !== 'hidden';
        };
        const overflow = [...document.querySelectorAll('body *')].filter(visible).filter(element => {
          if (element.classList.contains('sr-only')) return false;
          const box = element.getBoundingClientRect();
          return box.left < -1 || box.right > window.innerWidth + 1;
        }).map(element => element.tagName + '.' + element.className);
        const smallTargets = [...document.querySelectorAll('button,a,select,input')].filter(visible)
          .filter(element => !element.classList.contains('ux-skip'))
          .filter(element => { const box = element.getBoundingClientRect(); return box.width < 43.9 || box.height < 43.9; })
          .map(element => element.outerHTML.slice(0, 160));
        return { overflow, smallTargets, scrollWidth: document.documentElement.scrollWidth };
      });
      assert.deepEqual(layout.overflow, [], width + ' ' + path + ' overflow');
      assert.deepEqual(layout.smallTargets, [], width + ' ' + path + ' touch targets');
      assert(layout.scrollWidth <= width, 'No horizontal overflow');
      if (/state=(loading|missing|error)/.test(path)) {
        assert.equal(await page.locator('.ux-answer,.ux-question-card,.ux-person-card,.ux-timeline').count(), 0, 'No invented content on unavailable states');
      }
      results.matrices.push({ width, path, overflow: 0, minimumTarget: '44 CSS px' });
    }
    await visit('/');
    await shot('home-questions-' + width, '/');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/');
  assert.equal(await page.getByRole('tab', { name: '大家都在问' }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: '大家都在问' }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: '找TA问问' }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.ux-question-card').count(), 0);
  assert.equal(await page.locator('.ux-person-card').count(), 1);
  await shot('home-persons-390', '/?mode=people');
  await page.getByRole('button', { name: '看看 TA 的经历' }).click();
  await page.locator('.ux-person-summary').waitFor();
  await page.getByRole('button', { name: '展开完整经历' }).click();
  assert.equal(await page.getByRole('button', { name: '收起完整经历' }).getAttribute('aria-expanded'), 'true');
  await page.getByRole('button', { name: '收起完整经历' }).click();
  await page.goBack();
  await page.locator('.ux-person-card').waitFor();
  await page.getByRole('tab', { name: '大家都在问' }).click();
  await page.locator('.ux-card-link').click();
  await page.locator('.ux-question-detail').waitFor();
  await page.locator('.ux-answer .ux-name').click();
  await page.locator('.ux-person-summary').waitFor();
  results.checks.push('Home default; keyboard tabs; distinct cards; card/detail/author/Person navigation; browser Back; Experience expand/collapse');
  await visit('/question');
  await page.getByRole('button', { name: '查看回复样式' }).click();
  assert.equal(await page.locator('#preview-replies').count(), 1);
  await page.getByRole('button', { name: '有帮助', exact: true }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /未记录任何操作/);
  await visit('/question?state=closed');
  assert(await page.getByRole('button', { name: '问题已关闭', exact: true }).isDisabled());
  assert.equal(await page.locator('.ux-answer').count(), 1);
  await visit('/question?state=partial');
  assert.equal(await page.locator('.ux-budget').count(), 0);
  await visit('/person?state=empty');
  assert.equal(await page.locator('.ux-timeline').count(), 0);
  await page.getByRole('button', { name: '问问TA · 查看说明' }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /没有创建对话、预约或订单/);
  results.checks.push('Replies sample; Helpful unavailable without count; closed publicly readable/disabled; optional budget absent; no-evidence Person; no chat success');
  await visit('/');
  const trigger = page.getByRole('button', { name: '打开创建菜单' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Focus enters sheet');
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Focus remains trapped');
  }
  const layering = await page.evaluate(() => {
    const header = document.querySelector('.ux-home-header');
    const box = header.getBoundingClientRect();
    const top = document.elementFromPoint(box.x + 30, box.y + 30);
    return { header: getComputedStyle(header).zIndex, intercepted: !header.contains(top), topZ: getComputedStyle(top).zIndex };
  });
  assert.deepEqual(layering, { header: '20', intercepted: true, topZ: '50' }, 'Sheet overlay covers header, not old z90');
  await shot('home-sheet-390', '/ (creation sheet)');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  assert(await trigger.evaluate(element => document.activeElement === element), 'Focus returns to trigger');
  await trigger.click();
  await page.mouse.click(8, 185);
  assert.equal(await dialog.count(), 0, 'Backdrop closes');
  await trigger.click();
  await page.getByRole('button', { name: /我有问题 有件具体/ }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /未进入发布流程/);
  for (const width of [320, 375, 430, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    await visit('/');
    await trigger.click();
    const box = await dialog.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 845, 'Sheet fits ' + width);
    await page.getByRole('button', { name: '关闭', exact: true }).click();
  }
  results.checks.push('Sheet focus trap/Escape/backdrop/close/trigger restore; overlay z50 above header z20; sheet fits all five widths');
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/search');
  await page.getByRole('textbox').fill('设计输入，不是真实搜索');
  await page.getByRole('tab', { name: '人', exact: true }).click();
  assert.match(await page.getByRole('tabpanel').innerText(), /搜索能力尚未接入/);
  await page.getByRole('tab', { name: '综合', exact: true }).click();
  await visit('/');
  await page.getByRole('button', { name: '通知能力说明：预览未接入' }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /尚未接入/);
  await page.getByRole('button', { name: '城市说明：尚未选择城市' }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /不读取 GPS/);
  await page.locator('.ux-skip').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'preview-main');
  results.checks.push('Search only local text; Bell/city truthful; skip link does not mutate HashRouter');
  const deepLink = await context.newPage();
  await deepLink.goto(origin + '/#/person');
  await deepLink.getByLabel('选择预览状态').selectOption('empty');
  await deepLink.getByRole('button', { name: '返回上一预览页' }).click();
  await deepLink.locator('.ux-home-header').waitFor();
  await deepLink.close();
  results.checks.push('Fresh deep link + replaced state selection: preview Back returns Home, not unrelated history');
  await visit('/question');
  const contrast = await page.evaluate(() => {
    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = values => values.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index], 0);
    return ['.ux-question-detail h1', '.ux-context p', '.ux-meta', '.ux-action', '.ux-topics > span', '.ux-review-bar strong'].map(selector => {
      const element = document.querySelector(selector);
      let ancestor = element;
      while (getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)') ancestor = ancestor.parentElement;
      const foreground = luminance(rgb(getComputedStyle(element).color));
      const background = luminance(rgb(getComputedStyle(ancestor).backgroundColor));
      return { selector, ratio: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
    });
  });
  for (const entry of contrast) assert(entry.ratio >= 4.5, entry.selector + ' text contrast');
  results.contrast = contrast;
  results.checks.push('Six sampled text/action contrast pairs >=4.5:1; not an exhaustive WCAG certification');
  for (const [name, path, width] of [
    ['question-390', '/question', 390], ['person-390', '/person', 390],
    ['question-loading-375', '/question?state=loading', 375],
    ['question-error-375', '/question?state=error', 375],
    ['question-empty-375', '/question?state=empty', 375],
    ['person-empty-375', '/person?state=empty', 375],
    ['question-long-320', '/question?state=long', 320],
    ['person-long-320', '/person?state=long', 320],
  ]) {
    await page.setViewportSize({ width, height: 844 });
    await visit(path);
    await shot(name, path, true);
  }
  await visit('/question?state=loading');
  assert.equal(await page.locator('.animate-spin').evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0], 'No persisted preview identity/data');
  assert.deepEqual(failures, [], 'No browser errors or non-loopback requests');
  results.checks.push('Reduced motion; no external requests; no browser errors; no local/session storage writes; no real API/Auth');
  results.requests = [...new Set(results.requests)].sort();
  if (capture) writeFileSync(resolve(root, 'docs/visual-evidence/ux1a/browser-evidence.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ ...results, matrices: results.matrices.length, requests: results.requests.length }, null, 2));
} finally {
  await browser.close();
}
