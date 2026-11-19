// Portable-build alias ONLY: no Replit account or grant is used off-host.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const root = resolve("portable/data/legacy");
export class ReplitConnectors {
  async proxy(service, path, options = {}) {
    if (service !== "google-drive" || options.method !== "GET")
      throw Error("This connector must be configured for the new host.");
    const url = new URL(path, "http://offline.invalid");
    const id = url.pathname.match(
      /^\/drive\/v3\/files\/([a-zA-Z0-9_-]{10,200})$/,
    )?.[1];
    if (!id) return new Response(null, { status: 404 });
    const meta = JSON.parse(
      await readFile(resolve(root, "manifest.json"), "utf8"),
    ).find((f) => f.id === id);
    if (
      !meta ||
      meta.trashed !== false ||
      meta.appProperties?.konnectedEditorialImage !== "true" ||
      !["public", "evidence", "generated"].includes(
        meta.appProperties?.konnectedEditorialPurpose,
      )
    )
      return new Response(null, { status: 404 });
    if (url.searchParams.get("alt") !== "media") return Response.json(meta);
    const bytes = await readFile(resolve(root, id));
    if (
      bytes.length !== meta.size ||
      createHash("sha256").update(bytes).digest("hex") !== meta.sha256Checksum
    )
      throw Error("Legacy image integrity check failed");
    return new Response(bytes);
  }
}
