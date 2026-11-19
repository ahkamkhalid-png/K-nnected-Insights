// Operator-only; no HTTP routes, database access or provider writes.
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import {
  encryptStream,
  validatePassphrase,
} from "../../../../scripts/recovery-crypto.mjs";

const hash = (data) => createHash("sha256").update(data).digest("hex");
const format = "editorial-drive-v1";
const MAX_BYTES = 32 * 1024 * 1024; // Bounded in-memory recovery unit.
const fields = "id,mimeType,size,trashed,appProperties,sha256Checksum";
function metadata(f) {
  const purpose = f.appProperties?.konnectedEditorialPurpose;
  const size = Number(f.size);
  if (
    !/^[a-zA-Z0-9_-]{10,200}$/.test(f.id) ||
    f.trashed !== false ||
    f.appProperties?.konnectedEditorialImage !== "true" ||
    !["public", "evidence", "generated"].includes(purpose) ||
    !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(
      f.mimeType,
    ) ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 10 * 1024 * 1024 ||
    !/^[a-f0-9]{64}$/.test(f.sha256Checksum)
  )
    throw Error("Invalid or inaccessible tagged file");
  return {
    id: f.id,
    mimeType: f.mimeType,
    size,
    trashed: false,
    appProperties: {
      konnectedEditorialImage: "true",
      konnectedEditorialPurpose: purpose,
    },
    sha256Checksum: f.sha256Checksum,
  };
}
export const fingerprint = (files) => hash(JSON.stringify(files));
export async function inventory(get) {
  const p = new URLSearchParams({
    q: "trashed = false and appProperties has { key='konnectedEditorialImage' and value='true' }",
    fields: `nextPageToken,incompleteSearch,files(${fields})`,
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    pageSize: "1000",
  });
  const files = [],
    pages = new Set(),
    ids = new Set();
  let total = 0;
  for (;;) {
    const d = await (await get("/drive/v3/files?" + p)).json();
    if (d.incompleteSearch || !Array.isArray(d.files))
      throw Error("Incomplete inventory");
    for (const raw of d.files) {
      const f = metadata(raw);
      total += f.size;
      if (ids.has(f.id) || total > MAX_BYTES || files.length >= 1000)
        throw Error("Inventory duplicate or capacity exceeded");
      files.push(f);
      ids.add(f.id);
    }
    if (!d.nextPageToken) break;
    if (pages.has(d.nextPageToken)) throw Error("Repeated page token");
    pages.add(d.nextPageToken);
    p.set("pageToken", d.nextPageToken);
  }
  return files.sort((a, b) => (a.id < b.id ? -1 : 1));
}
export async function capture(get, approvedFingerprint, output, pass) {
  validatePassphrase(pass);
  const files = await inventory(get);
  if (!files.length || fingerprint(files) !== approvedFingerprint)
    throw Error("Source inventory not approved");
  const records = [];
  for (const f of files) {
    const response = await get(
      `/drive/v3/files/${f.id}?supportsAllDrives=true&alt=media`,
    );
    const chunks = [];
    let n = 0;
    for await (const chunk of response.body) {
      n += chunk.length;
      if (n > f.size) throw Error("Source size changed");
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length !== f.size || hash(bytes) !== f.sha256Checksum)
      throw Error("Source checksum mismatch");
    records.push({ ...f, base64: bytes.toString("base64") });
  }
  if (fingerprint(await inventory(get)) !== approvedFingerprint)
    throw Error("Inventory changed during capture");
  await encryptStream(
    Readable.from([
      JSON.stringify({ format, inventory: approvedFingerprint, records }),
    ]),
    output,
    pass,
  );
}
// Key by ORIGINAL Drive ID. No plaintext writes or provider fallback.
export function recover(bundle) {
  if (
    bundle?.format !== format ||
    !Array.isArray(bundle.records) ||
    !bundle.records.length ||
    bundle.records.length > 1000
  )
    throw Error("Invalid bundle");
  const files = new Map(),
    rows = [];
  let total = 0;
  for (const record of bundle.records) {
    const f = metadata(record);
    total += f.size;
    if (
      total > MAX_BYTES ||
      files.has(f.id) ||
      typeof record.base64 !== "string" ||
      record.base64.length !== 4 * Math.ceil(f.size / 3)
    )
      throw Error("Invalid recovery object");
    const bytes = Buffer.from(record.base64, "base64");
    if (bytes.length !== f.size || hash(bytes) !== f.sha256Checksum)
      throw Error("Recovery checksum mismatch");
    files.set(f.id, { metadata: f, bytes });
    rows.push(f);
  }
  if (fingerprint(rows) !== bundle.inventory)
    throw Error("Recovery inventory mismatch");
  return files;
}
