import { ReplitConnectors } from "@replit/connectors-sdk";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, realpath, stat } from "node:fs/promises";
import { inventory, fingerprint, capture, recover } from "./drive-bundle.mjs";
import { validatePassphrase } from "../../../../scripts/recovery-crypto.mjs";

try {
  const [op, ...args] = process.argv.slice(2);
  if (op === "verify" && args.length === 1) {
    const s = await stat(args[0]);
    if (!s.isFile() || s.mode & 0o077 || s.size > 50 * 1024 * 1024)
      throw Error();
    const bundle = JSON.parse(await readFile(args[0], "utf8"));
    const files = recover(bundle);
    console.log(
      `Verified original IDs, purpose metadata and SHA-256 for ${files.size} images offline. Inventory: ${bundle.inventory}.`,
    );
  } else {
    const drive = new ReplitConnectors();
    const get = async (path) => {
      const r = await drive.proxy("google-drive", path, { method: "GET" });
      if (!r.ok) throw Error();
      return r;
    };
    if (op === "inventory" && !args.length) {
      const rows = await inventory(get);
      console.log(
        JSON.stringify({
          count: rows.length,
          bytes: rows.reduce((sum, f) => sum + f.size, 0),
          fingerprint: fingerprint(rows),
        }),
      );
    } else if (op === "capture-approved" && args.length === 2) {
      const [digest, out] = args;
      const pass = process.env.RECOVERY_BACKUP_PASSPHRASE;
      validatePassphrase(pass);
      const parent = await realpath(dirname(out)),
        project = await realpath(
          fileURLToPath(new URL("../../../../", import.meta.url)),
        );
      if (
        !/^[0-9a-f]{64}$/.test(digest) ||
        !isAbsolute(out) ||
        parent === project ||
        parent.startsWith(project + sep) ||
        (await stat(parent)).mode & 0o077
      )
        throw Error();
      await capture(get, digest, resolve(out), pass);
      console.log("Encrypted Drive bundle created. No upload performed.");
    } else throw Error();
  }
} catch {
  console.error(
    "Drive recovery stopped. Check command, approved fingerprint, private paths, key custody, connector permissions, file metadata, limits and checksums.",
  );
  process.exitCode = 1;
}
