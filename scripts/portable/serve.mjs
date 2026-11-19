// Run from the portable GitHub checkout. Never serve the checkout/private data directory.
import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const folder = fileURLToPath(new URL("../../portable/", import.meta.url));
const root = await realpath(resolve(folder, "site"));
const { editorial, overview, functions, images } = JSON.parse(
  await readFile(resolve(folder, "public-api.json"), "utf8"),
);
if (!editorial.every((row) => row.status === "published"))
  throw Error("Public edition contains unpublished rows");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".gif": "image/gif",
  ".txt": "text/plain",
};
createServer(async (req, res) => {
  const reply = (s, t, b) => {
    res.writeHead(s, {
      "Content-Type": t,
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : b);
  };
  const json = (s, x) => reply(s, "application/json", JSON.stringify(x));
  try {
    if (!["GET", "HEAD"].includes(req.method))
      return json(405, { error: "Read-only edition" });
    const url = new URL(req.url, "http://localhost"),
      p = decodeURIComponent(url.pathname);
    if (url.searchParams.get("includeDrafts") === "true")
      return json(403, { error: "Staff access unavailable" });
    if (p === "/api/editorial") {
      const c = url.searchParams.get("collection");
      return json(200, {
        data: editorial.filter((x) => !c || x.collection === c),
      });
    }
    let m = p.match(/^\/api\/editorial\/([^/]+)\/([^/]+)$/);
    if (m) {
      const row = editorial.find(
        (x) => x.collection === m[1] && x.slug === m[2],
      );
      return json(
        row ? 200 : 404,
        row ? { data: row } : { error: "Not found" },
      );
    }
    if (p === "/api/future-work") return json(200, { data: overview });
    if (p === "/api/future-work/freshness")
      return json(200, { data: overview.freshness });
    m = p.match(/^\/api\/future-work\/functions\/([^/]+)$/);
    if (m && Object.hasOwn(functions, m[1]))
      return json(200, { data: functions[m[1]] });
    if (p.startsWith("/api/") && !Object.hasOwn(images, p))
      return json(404, { error: "Not available in public edition" });
    let target = resolve(
      root,
      "." + (Object.hasOwn(images, p) ? images[p] : p),
    );
    if (!target.startsWith(root + sep) && target !== root) return json(404, {});
    if (p === "/" || (!extname(p) && !p.startsWith("/api/")))
      target = resolve(root, "index.html");
    target = await realpath(target);
    if (!target.startsWith(root + sep) || !(await stat(target)).isFile())
      return json(404, {});
    reply(
      200,
      types[extname(target)] ?? "application/octet-stream",
      await readFile(target),
    );
  } catch {
    return json(404, { error: "Not found" });
  }
}).listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      "Public reading edition ready on port " + (process.env.PORT || 3000),
    ),
);
