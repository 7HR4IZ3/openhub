const TOKEN_PREFIX = "v1";

/**
 * Provider tokens are encrypted before they enter Convex data. The key is a
 * deployment secret, never a browser variable and never derived from a user.
 * If the key is absent, identity sign-in still works but private provider
 * access remains unavailable.
 */
export async function encryptProviderToken(token: string): Promise<string | null> {
  const key = await encryptionKey();
  if (key === null) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );
  return [TOKEN_PREFIX, toBase64(iv), toBase64(new Uint8Array(encrypted))].join(".");
}

export async function decryptProviderToken(value: string): Promise<string | null> {
  const key = await encryptionKey();
  if (key === null) return null;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(parts[1]) },
      key,
      fromBase64(parts[2]),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

async function encryptionKey(): Promise<CryptoKey | null> {
  const configured = process.env.OPENHUB_TOKEN_ENCRYPTION_KEY?.trim();
  if (!configured) return null;
  const raw = fromBase64(configured);
  if (raw.byteLength !== 32) throw new Error("OPENHUB_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
