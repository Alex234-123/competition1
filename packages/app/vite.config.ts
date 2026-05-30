import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// web dev / 普通网页构建配置(主演示路径,无需扩展)。
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5176,
    open: true,
  },
});
