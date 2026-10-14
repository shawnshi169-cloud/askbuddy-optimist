import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { DiscoveryError, LIMITS } from "../question-discovery-v1/contract";
import { cursorTokenSchema, type CursorPort, type CursorToken } from "../question-discovery-v1/snapshot";

export class TransportError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); this.name = "TransportError"; }
}
export const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const keySchema = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/),
  secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/), notBefore: z.number().int().nonnegative().safe(),
  encryptUntil: z.number().int().positive().safe(), decryptUntil: z.number().int().positive().safe(),
}).strict();
const configSchema = z.object({ active: z.string(), keys: z.array(keySchema).min(1).max(3) }).strict();

/** Explicit secret-manager input, never VITE/client config, environment discovery or default keys. */
export class KeyRing {
  private readonly keys = new Map<string, { secret: Buffer; notBefore: number; encryptUntil: number; decryptUntil: number }>();
  private readonly active: string;
  constructor(configuration: string, private readonly now: () => number = Date.now) {
    try {
      if (configuration.length > 4096) throw new Error();
      const config = configSchema.parse(JSON.parse(configuration));
      this.active = config.active;
      for (const key of config.keys) {
        const secret = Buffer.from(key.secret, "base64url");
        if (secret.length !== 32 || secret.toString("base64url") !== key.secret || this.keys.has(key.id) ||
          key.encryptUntil <= key.notBefore || key.decryptUntil < key.encryptUntil + 1_800_000) throw new Error();
        this.keys.set(key.id, { ...key, secret });
      }
      if (!this.keys.has(this.active)) throw new Error();
    } catch { throw new TransportError("KEY_CONFIGURATION_INVALID", 503); }
  }
  seal(purpose: "cursor" | "session" | "snapshot", value: unknown): string {
    const key = this.keys.get(this.active)!;
    if (this.now() < key.notBefore || this.now() >= key.encryptUntil) throw new TransportError("KEY_UNAVAILABLE", 503);
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key.secret, iv);
    cipher.setAAD(Buffer.from(`d1b1:${purpose}:${this.active}`));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    return ["d1b1", this.active, iv.toString("base64url"), encrypted.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
  }
  open(purpose: "cursor" | "session" | "snapshot", token: string, maxLength: number): unknown {
    try {
      if (token.length > maxLength) throw new Error();
      const [version, id, nonce, content, tag, extra] = token.split(".");
      const key = this.keys.get(id);
      if (version !== "d1b1" || extra !== undefined || !key || this.now() < key.notBefore || this.now() >= key.decryptUntil) throw new Error();
      const decode = (text: string) => {
        if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error();
        const bytes = Buffer.from(text, "base64url");
        if (bytes.toString("base64url") !== text) throw new Error();
        return bytes;
      };
      const iv = decode(nonce), authTag = decode(tag);
      if (iv.length !== 12 || authTag.length !== 16) throw new Error();
      const decipher = createDecipheriv("aes-256-gcm", key.secret, iv);
      decipher.setAAD(Buffer.from(`d1b1:${purpose}:${id}`)); decipher.setAuthTag(authTag);
      return JSON.parse(Buffer.concat([decipher.update(decode(content)), decipher.final()]).toString("utf8"));
    } catch { throw new TransportError("SEALED_STATE_INVALID", 409); }
  }
}

export class RotatingCursorCodec implements CursorPort {
  constructor(private readonly keys: KeyRing) {}
  encode(value: CursorToken): string {
    const token = this.keys.seal("cursor", cursorTokenSchema.parse(value));
    if (token.length > LIMITS.cursorBytes) throw new DiscoveryError("DATA_INTEGRITY_ERROR");
    return token;
  }
  decode(value: string): CursorToken {
    try { return cursorTokenSchema.parse(this.keys.open("cursor", value, LIMITS.cursorBytes)); }
    catch { throw new DiscoveryError("INVALID_CURSOR"); }
  }
}
