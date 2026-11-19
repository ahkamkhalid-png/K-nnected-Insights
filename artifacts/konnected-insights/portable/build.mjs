import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
const guest = resolve(root, "portable/guest.mjs");
if (!process.argv[2])
  throw Error("Specify a new output directory for the public site");
await build({
  root,
  configFile: false,
  envFile: false,
  envPrefix: "PORTABLE_NO_CLIENT_ENV_",
  plugins: [react(), tailwindcss({ optimize: false })],
  resolve: {
    alias: [
      { find: /^@clerk\/react(?:\/internal)?$/, replacement: guest },
      { find: "@/components/visitor-insights-chat", replacement: guest },
      { find: "@", replacement: resolve(root, "src") },
    ],
  },
  build: { outDir: resolve(process.argv[2]), emptyOutDir: false },
});
