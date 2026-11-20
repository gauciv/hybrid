import { defineConfig } from "vite";
import { resolve } from "node:path";

// Builds the engine as one self-contained script for the Android app's JavaScriptSandbox.
export default defineConfig({
  build: {
    outDir: resolve(__dirname, "../../apps/android/app/src/main/assets"),
    emptyOutDir: false,
    minify: true,
    lib: { entry: resolve(__dirname, "src/bridge.ts"), name: "KontrataCoreBundle", formats: ["iife"], fileName: () => "kontrata-core.js" },
  },
});
