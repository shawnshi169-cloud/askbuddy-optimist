import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importJWK, SignJWT } from 'jose';

const edgeCorePath = join(
  process.cwd(),
  'supabase',
  'functions',
  'wechat-auth',
  'core.mjs',
);
const {
  WECHAT_AUTH_ERROR_CODES,
  parsePrivateJwk,
} = await import(pathToFileURL(edgeCorePath).href);

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const testPrivateJwk = privateKey.export({ format: 'jwk' });
const validJwk = {
  ...testPrivateJwk,
  alg: 'ES256',
  kid: 'wechat-auth-test-key',
  key_ops: ['sign'],
  use: 'sig',
};

const parse = (jwk) => parsePrivateJwk(JSON.stringify(jwk));
const assertInvalid = (jwk) => {
  assert.throws(
    () => parse(jwk),
    (error) => {
      assert.equal(error?.code, WECHAT_AUTH_ERROR_CODES.AUTH_SESSION_ERROR);
      assert.equal(error?.status, 500);
      assert.equal(
        error?.message,
        'Authentication signing configuration is unavailable.',
      );
      return true;
    },
  );
};

const parsedSigningJwk = parse(validJwk);
assert.deepEqual(parsedSigningJwk.key_ops, ['sign']);
assert.equal(parse({ ...validJwk, key_ops: undefined }).key_ops, undefined);

assertInvalid({ ...validJwk, key_ops: ['sign', 'verify'] });
assertInvalid({ ...validJwk, key_ops: ['verify'] });
assertInvalid({ ...validJwk, d: undefined });
assertInvalid({ ...validJwk, x: undefined });
assertInvalid({ ...validJwk, y: undefined });
assertInvalid({ ...validJwk, crv: 'P-384' });
assertInvalid({ ...validJwk, kty: 'RSA' });

assert.equal(parse({ ...validJwk, use: 'sig' }).use, 'sig');
assertInvalid({ ...validJwk, use: 'enc' });
assert.equal(parse({ ...validJwk, alg: 'ES256' }).alg, 'ES256');
assertInvalid({ ...validJwk, alg: 'ES384' });

const signingKey = await importJWK(parsedSigningJwk, 'ES256');
const dummyToken = await new SignJWT({
  role: 'authenticated',
  sub: '00000000-0000-8000-8000-000000000001',
})
  .setProtectedHeader({ alg: 'ES256', kid: parsedSigningJwk.kid, typ: 'JWT' })
  .sign(signingKey);

assert.equal(typeof dummyToken, 'string');
assert.equal(dummyToken.split('.').length, 3);

console.log('WeChat Auth JWK configuration check passed.');
