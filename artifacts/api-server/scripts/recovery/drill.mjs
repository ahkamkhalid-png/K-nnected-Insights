import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = await mkdtemp(join(tmpdir(), "external-recovery-")),
  cluster = join(root, "pg");
const env = {
  PATH: process.env.PATH,
  LANG: "C",
  HOME: root,
  PGHOST: root,
  PGUSER: "drill",
  PGDATABASE: "postgres",
  PGPASSFILE: "/dev/null",
  PGSERVICEFILE: "/dev/null",
  NODE_ENV: "production",
  EDITORIAL_OWNER_EMAIL: "owner@example.invalid",
  DATABASE_URL: `postgresql:///postgres?host=${encodeURIComponent(root)}&user=drill`,
};
function cmd(name, args) {
  const r = spawnSync(name, args, { env, encoding: "utf8", timeout: 60000 });
  if (r.status !== 0) throw Error(`${name} failed: ${r.stderr || r.error}`);
  return r.stdout;
}
let started = false;
try {
  const providers = fileURLToPath(
    new URL("fixture-providers.mjs", import.meta.url),
  );
  await build({
    entryPoints: [fileURLToPath(new URL("fixture-app.mjs", import.meta.url))],
    outfile: join(root, "fixture.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    alias: { "@clerk/express": providers, "@replit/connectors-sdk": providers },
  });
  cmd("initdb", ["-D", cluster, "-U", "drill", "--auth=trust", "--no-locale"]);
  cmd("pg_ctl", [
    "-D",
    cluster,
    "-l",
    join(root, "postgres.log"),
    "-o",
    `-c listen_addresses='' -c unix_socket_directories='${root}' -c unix_socket_permissions=0700`,
    "-w",
    "start",
  ]);
  started = true;
  process.stdout.write(cmd(process.execPath, [join(root, "fixture.cjs")]));
} finally {
  if (started) cmd("pg_ctl", ["-D", cluster, "-m", "immediate", "-w", "stop"]);
  await rm(root, { recursive: true, force: true });
}
