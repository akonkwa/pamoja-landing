const crypto = require("crypto");

function ensureBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
}

function generateId(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const iterations = 120000;
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  return { hash, salt, iterations };
}

function verifyPassword(password, record) {
  const derived = crypto
    .pbkdf2Sync(password, record.salt, record.iterations, 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(record.hash, "hex"));
}

function encryptJson(value, secret) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash("sha256").update(ensureBuffer(secret)).digest();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
  });
}

function decryptJson(serialized, secret) {
  const parsed = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
  const key = crypto.createHash("sha256").update(ensureBuffer(secret)).digest();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(parsed.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "hex")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = {
  decryptJson,
  encryptJson,
  generateId,
  hashPassword,
  verifyPassword,
};
