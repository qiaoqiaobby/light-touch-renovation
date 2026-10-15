import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "./",
  build: {
    outDir: "mid/decor-dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    assetsInlineLimit: 100000000,
    rolldownOptions: { input: "decor.html" },
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
});
