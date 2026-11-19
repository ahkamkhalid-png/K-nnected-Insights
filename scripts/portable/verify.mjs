import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
const root = fileURLToPath(new URL("../../portable/", import.meta.url));
const { files } = JSON.parse(
  await readFile(resolve(root, "checksums.json"), "utf8"),
);
for (const [name, { bytes, sha256 }] of Object.entries(files)) {
  const path = resolve(root, name);
  if (
    !path.startsWith(resolve(root) + sep) ||
    (await stat(path)).size !== bytes ||
    createHash("sha256")
      .update(await readFile(path))
      .digest("hex") !== sha256
  )
    throw Error("Damaged or missing file: " + name);
}
console.log(
  `Verified ${Object.keys(files).length} files in the portable data and reading edition.`,
);
