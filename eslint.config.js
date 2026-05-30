// ESLint flat config —— TypeScript monorepo。
// 目标:抓真实问题(未用变量、any 滥用、不安全模式),不做风格洁癖(交给 prettier/编辑器)。
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // 忽略构建产物、依赖、数据目录。
  {
    ignores: [
      "**/dist/**",
      "**/dist-ext/**",
      "**/dist-types/**",
      "dist/**",
      "dist-ext/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.d.ts",
      "packages/server/data/**",
      "packages/app/.vite/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 源码:浏览器 + Node 全局(双构建),启用务实的告警。
  {
    files: ["packages/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // React 组件:启用 hooks 规则(依赖数组/调用顺序),捕获真实的 effect 依赖 bug。
  {
    files: ["packages/app/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // 测试文件:放宽(允许 any、非空断言,便于构造夹具)。
  {
    files: ["**/test/**/*.{ts,tsx}", "**/*.spec.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // Node 脚本(demo/工具):允许 console。
  {
    files: ["scripts/**/*.{mjs,js}"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "no-console": "off" },
  },
);
