import express from "express";
import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import storage from "../../src/routes/storage";
import {
  requireEditorialAdmin,
  requireEditorialStaff,
} from "../../src/middlewares/requireEditorialStaff";
import { mirror, token } from "./fixture-providers.mjs";
import { createHash, randomBytes } from "node:crypto";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { inventory, fingerprint, capture, recover } from "./drive-bundle.mjs";
import { decryptFile } from "../../../../scripts/recovery-crypto.mjs";

async function run() {
  // The launcher supplies a private Unix socket and an empty database; create only fixture tables.
  const root = process.env.HOME;
  const rows = ["public", "evidence", "generated"].map((purpose) => {
    const bytes = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      Buffer.from(purpose),
    ]);
    return {
      bytes,
      metadata: {
        id: `legacy_${purpose}_fixture`,
        size: String(bytes.length),
        mimeType: "image/png",
        trashed: false,
        appProperties: {
          konnectedEditorialImage: "true",
          konnectedEditorialPurpose: purpose,
        },
        sha256Checksum: createHash("sha256").update(bytes).digest("hex"),
      },
    };
  });
  const get = async (path) => {
    const u = new URL(path, "http://fixture.invalid");
    return u.pathname === "/drive/v3/files"
      ? Response.json({ files: rows.map((f) => f.metadata) })
      : new Response(
          rows.find((f) => u.pathname.endsWith("/" + f.metadata.id)).bytes,
        );
  };
  const pass = randomBytes(32).toString("hex"),
    digest = fingerprint(await inventory(get));
  const enc = join(root, "fixture.knrb"),
    json = join(root, "fixture.json");
  await assert.rejects(capture(get, "wrong inventory", enc, pass));
  await capture(get, digest, enc, pass);
  await decryptFile(enc, json, pass);
  const bundle = JSON.parse(await readFile(json));
  for (const [id, f] of recover(bundle)) mirror.set(id, f);
  bundle.records[0].appProperties.konnectedEditorialPurpose = "evidence";
  bundle.records[0].base64 = "";
  assert.throws(() => recover(bundle));
  await pool.query(
    `CREATE TABLE editorial_staff (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, role text NOT NULL, clerk_user_id text UNIQUE,clerk_invitation_id text,clerk_invitation_expires_at timestamptz,invitation_claim_token uuid, created_by_user_id text NOT NULL,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now())`,
  );
  await pool.query(
    `INSERT INTO editorial_staff(email,role,clerk_user_id,created_by_user_id) VALUES ('owner@example.invalid','owner','old-provider-owner','drill'),('stale@example.invalid','admin','old-provider-admin','drill')`,
  );
  for (const [id, role, expiry] of [
    ["admin", "admin", "1 day"],
    ["editor", "editor", "1 day"],
    ["expired", "admin", "-1 day"],
  ])
    await pool.query(
      `INSERT INTO editorial_staff(email,role,clerk_invitation_id,clerk_invitation_expires_at,invitation_claim_token,created_by_user_id) VALUES($1,$2,$3,now()+$4::interval,$5,'drill')`,
      [`${id}@example.invalid`, role, id, expiry, token],
    );
  const app = express();
  app.use("/api", storage);
  app.get("/staff", requireEditorialStaff, (q, r) =>
    r.json(r.locals.editorialAccess.role),
  );
  app.get("/admin", requireEditorialAdmin, (q, r) => r.sendStatus(204));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((ok, fail) =>
    server.once("listening", ok).once("error", fail),
  );
  try {
    const read = (path, id) =>
      fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        headers: id ? { "x-drill-user": id } : {},
      });
    for (const [id, status] of [
      ["owner", 204],
      ["admin", 204],
      ["editor", 403],
      ["stale", 403],
      ["expired", 403],
      ["removed", 403],
      [null, 401],
    ])
      assert.equal((await read("/admin", id)).status, status);
    for (const role of ["owner", "admin", "editor"])
      assert.equal(await (await read("/staff", role)).json(), role);
    await pool.query(
      "DELETE FROM editorial_staff WHERE email='editor@example.invalid'",
    );
    assert.equal((await read("/staff", "editor")).status, 403);
    for (const [i, route] of [
      "drive",
      "evidence/drive",
      "generated",
    ].entries()) {
      const { bytes, metadata } = rows[i];
      const url = `/api/storage/${route}/${metadata.id}`;
      if (i === 1) {
        assert.equal((await read(url)).status, 401);
        assert.equal((await read(url, "removed")).status, 403);
        for (const route of ["drive", "generated"])
          assert.equal(
            (await read(`/api/storage/${route}/${metadata.id}`)).status,
            404,
          );
      }
      const r = await read(url, i === 1 ? "admin" : null);
      assert.equal(r.status, 200);
      assert.equal(
        r.headers.get("content-type").split(";")[0],
        metadata.mimeType,
      );
      if (i === 1)
        assert.equal(r.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(Buffer.from(await r.arrayBuffer()), bytes);
    }
    console.log(
      "PASS: encrypted fixture bundle, original URLs and bytes, evidence privacy, owner bootstrap, fresh admin/editor claims, expired/stale/removed and anonymous denials.",
    );
  } finally {
    await new Promise((ok) => server.close(ok));
  }
}
run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
