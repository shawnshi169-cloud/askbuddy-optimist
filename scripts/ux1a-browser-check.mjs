// Opt-in loopback browser QA. No downloads, remote target, Auth or database.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import postcss from 'postcss';

assert(process.argv.includes('--local'), 'Explicit --local is required');
const { chromium } = await import(process.env.UX1A_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const capture = process.argv.includes('--capture');
const origin = 'http://127.0.0.1:4178';
const evidenceDir = resolve(root, 'docs/visual-evidence/ux1a/r2');
const browser = await chromium.launch({ headless: true,
  ...(process.env.UX1A_CHROME_PATH ? { executablePath: process.env.UX1A_CHROME_PATH } : {}) });
const results = { revision: 'UX1A-R2', data: 'synthetic presentation only', browser: browser.version(),
  testedAt: new Date().toISOString(), matrices: [], screenshots: [], comparisons: [], checks: [], requests: [], typography: [], colors: [], zoom: [] };
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { failures.push('External request: ' + url.origin); return route.abort(); }
    assert(!/\/(auth|rest|functions)\/v1\//.test(url.pathname), 'No API calls');
    const path = decodeURIComponent(url.pathname).replace('/@fs' + root + '/', '/@repo/');
    assert(!path.startsWith('/@fs/'), 'No unreviewed filesystem module');
    results.requests.push(path);
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });
  const visit = async (path, { view = 'user', palette = 'r2', hero = 'none' } = {}) => {
    const [pathname, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('view', view); params.set('palette', palette); params.set('hero', hero);
    await page.goto(origin + '/#' + pathname + '?' + params);
    await page.reload();
    await page.locator(view === 'lab' ? '.ux-review-bar' : '.ux-watermark').waitFor();
    await page.evaluate(() => document.fonts.ready);
  };
  const layout = () => page.evaluate(() => {
    const visible = element => {
      const box = element.getBoundingClientRect();
      return box.width && box.height && getComputedStyle(element).visibility !== 'hidden';
    };
    const overflow = [...document.querySelectorAll('body *')].filter(visible).filter(element => {
      if (element.classList.contains('sr-only') || element.classList.contains('ux-skip')) return false;
      const box = element.getBoundingClientRect();
      return box.left < -1 || box.right > innerWidth + 1;
    }).map(element => element.tagName + '.' + element.className);
    const smallTargets = [...document.querySelectorAll('button,a,select,input')].filter(visible)
      .filter(element => !element.classList.contains('ux-skip'))
      .filter(element => { const box = element.getBoundingClientRect(); return box.width < 43.9 || box.height < 43.9; })
      .map(element => element.outerHTML.slice(0, 140));
    const smallText = [...document.querySelectorAll('.ux-phone *, .ux-watermark *')].filter(visible)
      .filter(element => [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
      .filter(element => parseFloat(getComputedStyle(element).fontSize) < 12)
      .map(element => element.tagName + '.' + element.className);
    return { overflow, smallTargets, smallText, scrollWidth: document.documentElement.scrollWidth, width: innerWidth };
  });
  const checkLayout = async label => {
    const actual = await layout();
    assert.deepEqual(actual.overflow, [], label + ' horizontal overflow');
    assert.deepEqual(actual.smallTargets, [], label + ' 44px targets');
    assert.deepEqual(actual.smallText, [], label + ' meaningful text >=12px');
    assert(actual.scrollWidth <= actual.width, label + ' document width');
  };
  const shot = async (name, { fullPage = false, comparison = null } = {}) => {
    if (!capture) return;
    const filename = name + '.jpg';
    await page.screenshot({ path: resolve(evidenceDir, filename), type: 'jpeg', quality: 70, fullPage });
    const metadata = await page.evaluate(() => ({ path: location.hash, palette: document.body.dataset.uxPalette, view: document.body.dataset.uxView }));
    results.screenshots.push({ file: filename, viewport: page.viewportSize(), ...metadata,
      fullPage, comparison, revision: results.revision, data: results.data });
  };
  const scenes = [
    '/', '/?mode=people', '/?state=loading', '/?state=empty', '/?state=error',
    '/question', '/question?state=multiple', '/question?state=long', '/question?state=replies',
    '/question?state=loading', '/question?state=empty', '/question?state=error',
    '/question?state=missing', '/question?state=closed', '/question?state=partial',
    '/person', '/person?state=multiple', '/person?state=long', '/person?state=short',
    '/person?state=empty', '/person?state=loading', '/person?state=error', '/person?state=missing', '/person?state=partial',
    '/search', '/channel/education-learning', '/channel/career-development', '/channel/lifestyle-services', '/channel/hobbies-skills',
  ];
  for (const width of [320, 375, 390, 430, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    for (const view of ['user', 'lab']) for (const path of scenes) {
      await visit(path, { view });
      await checkLayout(width + '/' + view + path);
      if (/state=(loading|missing|error)/.test(path))
        assert.equal(await page.locator('.ux-answer,.ux-question-card,.ux-person-card,.ux-experience-story').count(), 0, 'No unavailable payload');
      results.matrices.push({ width, view, path, horizontalOverflow: 0, minimumTarget: 44, minimumText: 12 });
    }
  }
  results.checks.push('290 viewport/state/view cells; no horizontal overflow; visible controls >=44px; meaningful text >=12px');
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/');
  assert.equal(await page.getByRole('tab', { name: '大家都在问' }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.ux-lab-controls,.ux-review-bar,.ux-header-actions').count(), 0, 'No debug/City/Bell controls in user view');
  await page.getByRole('tab', { name: '大家都在问' }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: '找TA问问' }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('.ux-question-card').count(), 0);
  assert.equal(await page.locator('.ux-person-card').count(), 1);
  await page.getByRole('button', { name: '看看 TA 的经历' }).click();
  await page.getByRole('button', { name: '展开完整经历' }).click();
  assert.equal(await page.getByRole('button', { name: '收起完整经历' }).getAttribute('aria-expanded'), 'true');
  await page.getByRole('button', { name: '收起完整经历' }).click();
  await page.goBack();
  await page.locator('.ux-person-card').waitFor();
  await page.getByRole('tab', { name: '大家都在问' }).click();
  await page.locator('.ux-card-link').click();
  await page.locator('.ux-answer .ux-name').click();
  await page.locator('.ux-person-heading').waitFor();
  results.checks.push('Question default; keyboard tabs/visible focus; separate cards; card and author navigation; browser Back; Experience expand/collapse');
  await visit('/question?state=multiple');
  assert.equal(await page.locator('.ux-answer').count(), 2);
  await page.locator('.ux-answer').nth(1).locator('.ux-name').click();
  assert.match(await page.locator('.ux-person-heading h1').innerText(), /小许/);
  await visit('/question?state=long');
  assert.equal(await page.locator('.ux-answer-body').count(), 5);
  await page.getByRole('button', { name: '查看回复样式' }).click();
  assert.equal(await page.locator('#preview-replies').count(), 1);
  assert.equal(await page.locator('#preview-replies #preview-replies').count(), 0);
  await page.getByRole('button', { name: '有帮助', exact: true }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /未记录任何操作/);
  await visit('/question?state=closed');
  assert(await page.getByRole('button', { name: '问题已关闭', exact: true }).isDisabled());
  assert.equal(await page.locator('.ux-answer').count(), 1);
  await visit('/question?state=partial');
  assert.equal(await page.locator('.ux-budget').count(), 0);
  await page.getByRole('button', { name: '我来回答', exact: true }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /未发布回答/);
  await visit('/person?state=multiple');
  assert.equal(await page.locator('.ux-experience-story').count(), 2);
  assert.equal(await page.locator('.ux-experience-period').count(), 2, 'One period per Experience');
  await visit('/person?state=short');
  assert.equal(await page.locator('.ux-experience-story').count(), 1);
  await visit('/person?state=partial');
  assert.match(await page.locator('h1').innerText(), /未填写昵称/);
  assert.equal(await page.locator('.ux-experience-story').count(), 0);
  await visit('/person?state=empty');
  assert.equal(await page.locator('.ux-timeline').count(), 0);
  await page.getByRole('button', { name: '问问TA · 查看说明' }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /没有创建对话、预约或订单/);
  results.checks.push('Multiple/long/free Answers; missing avatar; one-level reply; correct CTA; closed readable/disabled; absent optional budget; matching fictional authors; multiple/short/empty/incomplete Experiences; no chat success');
  await visit('/');
  const trigger = page.getByRole('button', { name: '打开创建菜单' });
  const dialog = page.getByRole('dialog');
  for (const width of [320, 375, 390, 430, 1200]) {
    await page.setViewportSize({ width, height: 844 });
    await visit('/');
    await trigger.click();
    assert(await dialog.evaluate(element => element.contains(document.activeElement)));
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Focus trapped');
    }
    const layering = await page.evaluate(() => {
      const header = document.querySelector('.ux-home-header');
      const box = header.getBoundingClientRect();
      return { header: getComputedStyle(header).zIndex,
        intercepted: !header.contains(document.elementFromPoint(box.x + 30, box.y + 30)),
        topZ: getComputedStyle(document.elementFromPoint(box.x + 30, box.y + 30)).zIndex };
    });
    assert.deepEqual(layering, { header: '20', intercepted: true, topZ: '50' }, 'Overlay covers header at z50');
    const box = await dialog.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 845, 'Sheet fits');
    await checkLayout('Sheet/' + width);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert(await trigger.evaluate(element => document.activeElement === element));
    await trigger.click(); await page.mouse.click(8, 160);
    assert.equal(await dialog.count(), 0, 'Backdrop closes');
    await trigger.click(); await page.getByRole('button', { name: '关闭', exact: true }).click();
    assert(await trigger.evaluate(element => document.activeElement === element));
  }
  await trigger.click();
  assert.match(await dialog.innerText(), /我有问题/);
  assert.match(await dialog.innerText(), /我有经历/);
  assert.match(await dialog.innerText(), /技能服务尚未开放/);
  await page.getByRole('button', { name: /我有问题 有件具体/ }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /未进入发布流程/);
  results.checks.push('Sheet fits all widths; backdrop covers header; focus trap/Escape/backdrop/close/restore; two proposed intents; separate unopened Skill Service');
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/search');
  assert.deepEqual(await page.getByRole('tab').evaluateAll(elements => elements.map(element => element.id)), ['tab-all', 'tab-person', 'tab-question']);
  await page.getByRole('textbox').fill('设计输入，不是真实搜索');
  await page.getByRole('tab', { name: '人', exact: true }).click();
  assert.match(await page.getByRole('tabpanel').innerText(), /搜索能力尚未接入/);
  await visit('/', { view: 'lab' });
  await page.getByRole('button', { name: '通知能力说明：预览未接入' }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /尚未接入/);
  await page.getByRole('button', { name: '城市说明：尚未选择城市' }).click();
  assert.match(await page.locator('.ux-notice').innerText(), /不读取 GPS/);
  await page.getByRole('button', { name: '查看用户视角' }).click();
  assert.equal(await page.locator('.ux-lab-controls').count(), 0);
  await page.getByRole('button', { name: '实验室', exact: true }).click();
  await page.getByLabel('选择对照配色').selectOption('r1');
  await page.getByLabel('选择首页开场').selectOption('compact');
  await page.locator('.ux-skip').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'preview-main');
  const deepLink = await context.newPage();
  await deepLink.goto(origin + '/#/person?view=lab');
  await deepLink.getByLabel('选择预览状态').selectOption('empty');
  await deepLink.getByRole('button', { name: '返回上一预览页' }).click();
  await deepLink.locator('.ux-home-header').waitFor(); await deepLink.close();
  results.checks.push('Search exact all/person/question; local text only; Lab/user switch; full controls; truthful City/Bell; safe skip/deep-link Back');
  const measured = async () => page.evaluate(() => {
    const css = getComputedStyle(document.body);
    const roles = Object.fromEntries(['mint', 'soft', 'action', 'page', 'surface', 'ink', 'muted', 'border', 'hover', 'pressed', 'error'].map(role => [role, css.getPropertyValue('--ux-' + role).trim()]));
    const selectors = ['.ux-question-detail h1', '.ux-context p', '.ux-meta', '.ux-action', '.ux-answer-body', '.ux-topics > span', '.ux-watermark'];
    const type = selectors.map(selector => {
      const element = document.querySelector(selector), style = getComputedStyle(element);
      return { selector, fontSize: style.fontSize, lineHeight: style.lineHeight, weight: style.fontWeight };
    });
    const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = values => values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      .reduce((sum, v, index) => sum + v * [.2126, .7152, .0722][index], 0);
    const contrast = selectors.map(selector => {
      const element = document.querySelector(selector);
      let ancestor = element;
      while (getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)') ancestor = ancestor.parentElement;
      const fg = getComputedStyle(element).color, bg = getComputedStyle(ancestor).backgroundColor;
      const a = luminance(rgb(fg)), b = luminance(rgb(bg));
      return { selector, fg, bg, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
    return { roles, type, contrast };
  });
  for (const palette of ['r1', 'r2']) {
    await visit('/question?state=multiple', { palette });
    const actual = await measured();
    for (const pair of actual.contrast) assert(pair.ratio >= 4.5, palette + '/' + pair.selector + ' contrast');
    results.colors.push({ palette, roles: actual.roles, contrast: actual.contrast });
    if (palette === 'r2') results.typography = actual.type;
  }
  await visit('/question');
  await page.locator('.ux-action').hover();
  const hover = await measured();
  assert(hover.contrast.find(entry => entry.selector === '.ux-action').ratio >= 4.5);
  await page.mouse.down();
  const pressed = await measured();
  assert(pressed.contrast.find(entry => entry.selector === '.ux-action').ratio >= 4.5);
  await page.mouse.up();
  results.actionStates = { hover: hover.contrast.find(entry => entry.selector === '.ux-action'), pressed: pressed.contrast.find(entry => entry.selector === '.ux-action') };
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert(await page.locator('.ux-action').evaluate(element => document.activeElement === element), 'Keyboard returns to primary action');
  assert.equal(await page.locator('.ux-action').evaluate(element => getComputedStyle(element).outlineWidth), '3px');
  results.checks.push('Both comparison palettes text contrast >=4.5:1; hover action readable; 3px keyboard focus; actual CSS colors/type recorded');
  const captureScenes = [
    ['home-questions', '/', false], ['home-persons', '/?mode=people', false],
    ['question-multiple', '/question?state=multiple', true], ['person-multiple', '/person?state=multiple', true],
    ['create-sheet', '/', false], ['person-empty', '/person?state=empty', true], ['question-error', '/question?state=error', true],
  ];
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [name, path, fullPage] of captureScenes) {
      const pair = [];
      for (const palette of ['r1', 'r2']) {
        await visit(path, { palette });
        if (name === 'create-sheet') await trigger.click();
        await checkLayout(name + '/' + width + '/' + palette);
        const content = await page.locator(name === 'create-sheet' ? '[role=dialog]' : '.ux-phone').innerText();
        const geometry = await page.locator(name === 'create-sheet' ? '[role=dialog]' : '.ux-phone').evaluate(element => [...element.querySelectorAll('h1,h2,h3,article,button')].map(child => {
          const box = child.getBoundingClientRect();
          return [child.tagName, box.x, box.y, box.width, box.height];
        }));
        const signature = createHash('sha256').update(JSON.stringify({ content, geometry })).digest('hex');
        pair.push(signature);
        await shot((palette === 'r1' ? 'r1-palette-' : 'r2-') + name + '-' + width, { fullPage, comparison: 'Same R2 content/layout/type/view; palette only' });
      }
      assert.equal(pair[0], pair[1], 'Identical content/geometry for ' + name + '/' + width);
      results.comparisons.push({ name, width, identicalContentAndGeometry: true, hash: pair[0] });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  results.firstScreen = [];
  for (const hero of ['none', 'compact']) for (const mode of ['questions', 'people']) {
    await visit('/?mode=' + mode, { hero });
    const rect = await page.locator(mode === 'questions' ? '.ux-card-link' : '.ux-evidence').boundingBox();
    assert(rect.y + rect.height < 772, 'Concrete content before bottom nav');
    results.firstScreen.push({ hero, mode, y: rect.y, bottom: rect.y + rect.height, viewport: '390x844' });
    if (hero === 'compact') await shot('r2-home-' + mode + '-compact-390');
  }
  for (const [name, path] of [['long-answer', '/question?state=long'], ['replies', '/question?state=replies'], ['short-experience', '/person?state=short'], ['partial-person', '/person?state=partial'], ['loading', '/question?state=loading']]) {
    await visit(path); await shot('r2-' + name + '-390', { fullPage: true });
  }
  await visit('/', { view: 'lab' }); await shot('r2-lab-390');
  for (const width of [320, 390]) for (const path of ['/', '/?mode=people', '/question?state=long', '/person?state=multiple', '/search']) {
    await page.setViewportSize({ width, height: 844 }); await visit(path);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.ux-home-header,.ux-subhead')).top === document.querySelector('.ux-watermark').getBoundingClientRect().height + 'px');
    await checkLayout('200%/' + width + path);
    if (path === '/') {
      await trigger.click(); await checkLayout('200% Sheet/' + width);
      assert(await dialog.evaluate(element => element.scrollHeight >= element.clientHeight));
      await page.keyboard.press('Escape');
    }
    if (path.startsWith('/question')) assert.equal(await page.locator('.ux-context p').evaluate(element => getComputedStyle(element).fontSize), '32px');
    results.zoom.push({ width, path, emulation: 'Root font-size 200%; rem text doubles; not physical device/browser text-only zoom', horizontalOverflow: 0 });
    if (width === 320 && (path === '/' || path.startsWith('/question'))) await shot('r2-zoom200-' + (path === '/' ? 'home' : 'question') + '-320');
  }
  await visit('/question?state=loading');
  assert.equal(await page.locator('.animate-spin').evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0]);
  assert.deepEqual(failures, [], 'No browser errors or external requests');
  results.checks.push('200% root-font emulation at 320/390; no overflow/clipped controls; Sheet can scroll; body 16->32px; watermark/header adapt; reduced motion; no persistent storage/API calls');
  results.requests = [...new Set(results.requests)].sort();
  if (capture) {
    const colorDeclarations = source => {
      const entries = [];
      postcss.parse(source).walkDecls(decl => {
        if (/^(color|background(?:-color)?|border(?:-(top|bottom|left|right))?(?:-color)?|outline|box-shadow|--ux-(mint|soft|action|page|surface|ink|muted|border|hover|pressed|error))$/.test(decl.prop))
          entries.push({ selector: decl.parent.selector ?? decl.parent.name, property: decl.prop, value: decl.value, line: decl.source.start.line });
      });
      return entries;
    };
    const r1 = execFileSync('git', ['show', '692987b6f7a44eecd897ea8716568a5a27f65826:visual-preview/ux1a/preview.css'], { cwd: root, encoding: 'utf8' });
    const r2 = readFileSync(resolve(root, 'visual-preview/ux1a/preview.css'), 'utf8');
    const audit = { source: '692987b6f7a44eecd897ea8716568a5a27f65826', r1Declarations: colorDeclarations(r1), r2Declarations: colorDeclarations(r2),
      interpretation: 'Every R1 color declaration audited; R2 consolidates into scoped semantic roles. Controlled R1 palette uses original base roles on identical R2 composition; original R1 captures remain unchanged.', measuredRoles: results.colors };
    writeFileSync(resolve(evidenceDir, 'color-audit.json'), JSON.stringify(audit, null, 2) + '\n');
    writeFileSync(resolve(evidenceDir, 'browser-evidence.json'), JSON.stringify(results, null, 2) + '\n');
    const bytes = results.screenshots.reduce((sum, shot) => sum + statSync(resolve(evidenceDir, shot.file)).size, 0);
    assert(bytes < 4 * 1024 * 1024, 'Selected optimized screenshots <4 MiB');
  }
  console.log(JSON.stringify({ revision: results.revision, browser: results.browser, matrices: results.matrices.length, comparisons: results.comparisons.length,
    screenshots: results.screenshots.length, zoom: results.zoom.length, checks: results.checks, firstScreen: results.firstScreen,
    typography: results.typography, contrast: results.colors.map(color => ({ palette: color.palette, minimum: Math.min(...color.contrast.map(pair => pair.ratio)) })) }, null, 2));
} finally { await browser.close(); }
