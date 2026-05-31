import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const cacheDir = fileURLToPath(new URL("./.vitest-cache", import.meta.url));

export default defineConfig({
  cacheDir,
  test: {
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/types.ts",
        "**/*.d.ts",
        "packages/app/**",
        "packages/server/**",
        "packages/runner/**",
      ],
      // core 是纯逻辑核心,设门槛防回归;纯类型声明(types.ts)无运行时逻辑故排除;
      // app/server/runner 含 DOM/网络/浏览器(Playwright)副作用,已排除在外。
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        // 分支覆盖含大量防御性/错误处理分支(难穷举),天然低于行覆盖;
        // 故门槛设 75%(实测 ~80%),行/语句/函数仍守 80%。
        branches: 75,
      },
    },
  },
});
