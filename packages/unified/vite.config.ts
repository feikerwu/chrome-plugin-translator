import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        "content-translator": resolve(__dirname, "src/content/translator.ts"),
        "content-twitter": resolve(__dirname, "src/content/twitter.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (
            chunkInfo.name === "background" ||
            chunkInfo.name === "content-translator" ||
            chunkInfo.name === "content-twitter"
          ) {
            return "[name].js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
});
