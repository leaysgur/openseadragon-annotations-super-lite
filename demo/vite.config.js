import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  base: "/openseadragon-annotations-super-lite/",
  server: {
    fs: { allow: [".."] }
  },
  build: {
    emptyOutDir: true,
    outDir: "../docs",
  },
  plugins: [svelte()],
});
