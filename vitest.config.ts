import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "**/index.ts",
        "**/*.d.ts",
        "packages/app/**",
        "packages/server/**",
        "packages/runner/**",
      ],
      // core 是纯逻辑核心,设 80% 门槛防回归;app/server/runner 含 DOM/网络/浏览器(Playwright)副作用,已排除在外。
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
