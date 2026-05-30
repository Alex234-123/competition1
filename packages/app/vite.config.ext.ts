import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config.js";

// MV3 扩展构建配置(@crxjs)。产物 dist-ext 可在 Chrome 加载。
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    // 输出到仓库根 dist-ext(与 .gitignore、README 加载路径一致)。
    outDir: "../../dist-ext",
    emptyOutDir: true,
  },
  server: {
    port: 5177,
    cors: { origin: [/chrome-extension:\/\//] },
  },
});
