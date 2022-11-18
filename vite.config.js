import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/openseadragon-annotations-super-lite/",
  plugins: [svelte()],
});
