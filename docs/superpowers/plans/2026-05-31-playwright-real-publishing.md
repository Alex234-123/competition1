# Playwright Real Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Playwright runner and app integration so selected platforms can use browser automation for draft or full-auto publishing.

**Architecture:** Add `packages/runner` as a localhost Fastify service that owns Playwright browser sessions, platform automation adapters, diagnostics, and fixture-test helpers. Extend the app bridge/store/settings to call the runner per platform after core has produced existing platform payloads.

**Tech Stack:** TypeScript project references, Fastify, Playwright Chromium, Vitest, existing React/Zustand app bridge.

---

### Task 1: Runner Package Skeleton And Contracts

**Files:**
- Create: `packages/runner/package.json`
- Create: `packages/runner/tsconfig.json`
- Create: `packages/runner/src/types.ts`
- Create: `packages/runner/src/index.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Test: `packages/runner/test/types.spec.ts`

- [ ] **Step 1: Write failing contract tests**

Create `packages/runner/test/types.spec.ts` with tests for valid modes, request validation, and receipt validation.

- [ ] **Step 2: Run test and verify RED**

Run: `npm.cmd test -- packages/runner/test/types.spec.ts`

Expected: fails because `../src/types.js` does not exist.

- [ ] **Step 3: Add runner package and type implementation**

Create package metadata, TS config, exported types, and validation helpers:

```ts
export const automationModes = ["draft", "full-auto"] as const;
export type AutomationMode = (typeof automationModes)[number];
export type AutomationPlatformId = "wechat" | "zhihu" | "bilibili" | "xiaohongshu";
export type AutomationStatus = "drafted" | "published" | "needs-user-action" | "failed";
```

Include `isAutomationMode`, `isAutomationPlatformId`, `parseAutomationPublishRequest`, and `isAutomationPublishReceipt`.

- [ ] **Step 4: Run tests and typecheck package**

Run: `npm.cmd test -- packages/runner/test/types.spec.ts`

Run: `npm.cmd run build -w @mpp/runner`

- [ ] **Step 5: Commit**

Commit runner skeleton only.

### Task 2: Runner HTTP API

**Files:**
- Create: `packages/runner/src/config.ts`
- Create: `packages/runner/src/server.ts`
- Create: `packages/runner/src/cli.ts`
- Modify: `packages/runner/package.json`
- Test: `packages/runner/test/server.spec.ts`

- [ ] **Step 1: Write failing route tests**

Test `GET /health`, invalid `POST /automation/publish`, and valid publish request using an injected fake publisher.

- [ ] **Step 2: Run test and verify RED**

Run: `npm.cmd test -- packages/runner/test/server.spec.ts`

Expected: fails because `buildRunnerApp` does not exist.

- [ ] **Step 3: Implement Fastify app**

Implement `buildRunnerApp(options)` with CORS-safe localhost defaults, `/health`, `/automation/publish`, `/automation/session/open`, and `/automation/session/close`.

- [ ] **Step 4: Run tests**

Run: `npm.cmd test -- packages/runner/test/server.spec.ts`

- [ ] **Step 5: Commit**

Commit HTTP API.

### Task 3: Playwright Session And Diagnostics

**Files:**
- Create: `packages/runner/src/browser/session.ts`
- Create: `packages/runner/src/diagnostics/artifacts.ts`
- Test: `packages/runner/test/session.spec.ts`
- Test: `packages/runner/test/artifacts.spec.ts`

- [ ] **Step 1: Write failing tests**

Test profile path resolution, platform isolation, run artifact directory naming, and JSON redaction behavior.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- packages/runner/test/session.spec.ts packages/runner/test/artifacts.spec.ts`

- [ ] **Step 3: Implement helpers**

Implement deterministic path helpers and lazy Playwright persistent context session manager.

- [ ] **Step 4: Run tests**

Run: `npm.cmd test -- packages/runner/test/session.spec.ts packages/runner/test/artifacts.spec.ts`

- [ ] **Step 5: Commit**

Commit session and diagnostics helpers.

### Task 4: Platform Automation Adapter Core With Fixture Tests

**Files:**
- Create: `packages/runner/src/platforms/types.ts`
- Create: `packages/runner/src/platforms/common.ts`
- Create: `packages/runner/src/platforms/registry.ts`
- Create: `packages/runner/src/platforms/zhihu.ts`
- Create: `packages/runner/src/platforms/bilibili.ts`
- Create: `packages/runner/src/platforms/xiaohongshu.ts`
- Create: `packages/runner/src/platforms/wechat.ts`
- Test: `packages/runner/test/platform-fixtures.spec.ts`

- [ ] **Step 1: Write failing fixture tests**

Use Playwright pages built from local HTML strings. Verify each adapter fills title/body/tags and clicks the publish button only for `full-auto`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- packages/runner/test/platform-fixtures.spec.ts`

- [ ] **Step 3: Implement adapter core**

Implement selector-based fill helpers, blocker detection by visible text, and per-platform adapters using stable fixture selectors first.

- [ ] **Step 4: Run tests**

Run: `npm.cmd test -- packages/runner/test/platform-fixtures.spec.ts`

- [ ] **Step 5: Commit**

Commit automation adapters.

### Task 5: App Bridge And Store Integration

**Files:**
- Modify: `packages/app/src/bridge/types.ts`
- Modify: `packages/app/src/bridge/mock-bridge.ts`
- Modify: `packages/app/src/bridge/chrome-bridge.ts`
- Modify: `packages/app/src/state/store.ts`
- Modify: `packages/app/src/main.tsx`
- Test: `packages/app/test/store-automation-publish.spec.ts`

- [ ] **Step 1: Write failing app test**

Test that `publishAll` calls `bridge.publishAutomation` for platforms configured as `full-auto`, stores receipts, and leaves non-automation platforms on mock publish.

- [ ] **Step 2: Run test and verify RED**

Run: `npm.cmd test -- packages/app/test/store-automation-publish.spec.ts`

- [ ] **Step 3: Implement bridge and store changes**

Add `AutomationPublishMode`, runner URL state, per-platform automation modes, `publishAutomation` bridge method, settings persistence, and receipt integration.

- [ ] **Step 4: Run app tests**

Run: `npm.cmd test -- packages/app/test/store-automation-publish.spec.ts`

- [ ] **Step 5: Commit**

Commit app integration.

### Task 6: Settings UI And Documentation

**Files:**
- Modify: `packages/app/src/components/SettingsDrawer.tsx`
- Modify: `packages/app/src/App.tsx`
- Modify: `README.md`
- Test: `npm.cmd run typecheck`

- [ ] **Step 1: Write or update UI assertions**

Extend existing app tests if practical; otherwise rely on typecheck and manual UI smoke because settings rendering is currently not unit-tested.

- [ ] **Step 2: Implement UI**

Add runner URL, login browser helper, and per-platform automation mode selects.

- [ ] **Step 3: Update docs**

Document `npm.cmd run runner`, login bootstrap, full-auto risks, and the no-bypass blocker behavior.

- [ ] **Step 4: Verify**

Run `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build -w @mpp/runner`, and `npm.cmd run build -w @mpp/app`.

- [ ] **Step 5: Commit**

Commit UI and docs.

