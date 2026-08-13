const assert = require('node:assert/strict');

const configPath = require.resolve('../config/client');
const fixturesPath = require.resolve('../utils/presentation-fixtures');

function loadFixtures(envVersion) {
  global.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion } })
  };
  delete require.cache[configPath];
  delete require.cache[fixturesPath];
  return require(fixturesPath);
}

function assertDisabled(envVersion) {
  const fixtures = loadFixtures(envVersion);
  assert.equal(fixtures.isDevelopmentPresentationEnabled(), false);
  assert.equal(fixtures.getHomePresentation().enabled, false);
  assert.deepEqual(fixtures.getHomePresentation().hotTopics, []);
  assert.deepEqual(fixtures.getHomePresentation().experts, []);
  assert.equal(fixtures.getTopicPresentation('presentation-topic-study-abroad'), null);
  assert.equal(fixtures.getExpertPresentation('presentation-expert-study'), null);
  assert.deepEqual(fixtures.getInteractionPresentation(), []);
}

const develop = loadFixtures('develop');
assert.equal(develop.isDevelopmentPresentationEnabled(), true);
assert.equal(develop.getHomePresentation().enabled, true);
assert.ok(develop.getHomePresentation().hotTopics.length > 0);
assert.ok(develop.getHomePresentation().experts.length > 0);
assert.ok(develop.getTopicPresentation('presentation-topic-study-abroad'));
assert.ok(develop.getExpertPresentation('presentation-expert-study'));
process.stdout.write('PASS develop enables presentation fixtures\n');

for (const envVersion of ['trial', 'release', 'unexpected']) {
  assertDisabled(envVersion);
  process.stdout.write(`PASS ${envVersion} disables presentation fixtures\n`);
}

delete global.wx;
