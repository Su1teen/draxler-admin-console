import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    react(),
    // Pin the Vercel function runtime: otherwise Nitro copies the build machine's Node
    // version (a Node 20 build produced "nodejs20.x", which Vercel has discontinued).
    nitro({ vercel: { functions: { runtime: "nodejs22.x" } } }),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
