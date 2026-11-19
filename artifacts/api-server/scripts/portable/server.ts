// This is NOT the deployed app entrypoint. Imports routes, never seeds or starts workers.
import express from "express";
import { resolve } from "node:path";
import app from "../../src/app";
const dir = resolve("artifacts/konnected-insights/dist/public");
app.use("/api", (_req, res) => {
  res.sendStatus(404);
});
app.use(express.static(dir));
app.get("/{*path}", (_req, res) => res.sendFile(resolve(dir, "index.html")));
app.listen(Number(process.env.PORT || 3000), process.env.HOST || "127.0.0.1");
