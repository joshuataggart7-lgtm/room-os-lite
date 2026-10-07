import { defineConfig } from "vite";
// Relative base so the same build works at any path (GitHub Pages project site, a CDN, a local folder).
export default defineConfig({ base: "./", build: { target: "es2017", assetsInlineLimit: 0, chunkSizeWarningLimit: 900 } });
