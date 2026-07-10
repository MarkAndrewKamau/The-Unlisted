import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    // Without this, the build never goes through Nitro at all — it just emits
    // dist/client + dist/server, which Vercel doesn't recognize as anything
    // (hence a platform-level 404 on deploy). Nitro auto-detects the "vercel"
    // preset when building on Vercel, no extra config needed.
    nitro(),
    viteReact(),
  ],
});
