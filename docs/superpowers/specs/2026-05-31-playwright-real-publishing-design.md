# Playwright Real Publishing Design

## Goal

Add a local Playwright-based publishing runner so the product can perform real distribution on platforms that do not expose stable public publishing APIs: Zhihu, Bilibili, and Xiaohongshu. WeChat Official Account keeps the current official API path as the primary route, with Playwright as an optional fallback for web-console workflows.

The feature is a user-controlled local automation tool. It uses the user's own browser login state and never stores platform passwords. It may click the final publish button only when the user explicitly enables full-auto publishing.

## Non-Goals

- Do not bypass CAPTCHA, SMS verification, QR login, risk checks, face verification, or platform review gates.
- Do not scrape or store account passwords.
- Do not provide bot-like bulk posting or engagement automation.
- Do not promise platform stability when a creator center changes DOM structure or flow.

## Product Behavior

The app keeps the current authoring flow:

1. User writes content in the app.
2. Core converts Markdown into platform-specific payloads.
3. Validation blocks payloads with hard errors.
4. User chooses publish mode:
   - `mock`: current simulated publishing.
   - `assist`: current clipboard or extension-assisted handoff.
   - `draft`: Playwright fills the platform page and saves or leaves a draft.
   - `full-auto`: Playwright fills the page and clicks the final publish button.
5. The app shows per-platform progress, screenshots on failure, and final receipts.

Full-auto mode must be opt-in in settings and shown as a high-risk mode. The setting is local-only.

## Architecture

Add a new workspace package:

```text
packages/runner/
  src/
    index.ts
    server.ts
    config.ts
    types.ts
    browser/session.ts
    platforms/
      wechat.ts
      zhihu.ts
      bilibili.ts
      xiaohongshu.ts
    selectors/
      wechat.ts
      zhihu.ts
      bilibili.ts
      xiaohongshu.ts
    diagnostics/
      artifacts.ts
```

`packages/runner` exposes a localhost HTTP API. The existing app calls it through `PlatformBridge`, similar to the current WeChat server bridge.

The runner has no access to AppSecret or LLM keys. It receives only the already-adapted platform payload and local image files/data URLs needed for upload.

## Data Contracts

```ts
export type AutomationMode = "draft" | "full-auto";

export interface AutomationPublishRequest {
  platformId: "wechat" | "zhihu" | "bilibili" | "xiaohongshu";
  mode: AutomationMode;
  payload: SerializedPayload;
  options?: {
    headless?: boolean;
    slowMoMs?: number;
    timeoutMs?: number;
    profileDir?: string;
  };
}

export interface AutomationPublishReceipt {
  ok: boolean;
  status: "drafted" | "published" | "needs-user-action" | "failed";
  message: string;
  remoteUrl?: string;
  screenshotPath?: string;
  tracePath?: string;
  diagnosticsPath?: string;
}
```

`needs-user-action` is returned when the platform asks for login, CAPTCHA, SMS verification, account risk confirmation, manual topic selection, or any human-only step.

## Runner API

```text
GET  /health
POST /automation/publish
POST /automation/session/open
POST /automation/session/close
```

`/health` returns installed browser status and whether persistent profile directories exist.

`/automation/session/open` opens a visible browser for the user to log in or refresh login state before publishing.

`/automation/publish` performs one platform publish task at a time. The first implementation should run tasks sequentially to avoid platform risk and browser profile contention.

## Browser Session Strategy

Use Playwright Chromium with persistent context:

```text
data/playwright-profiles/{platformId}/
```

Each platform gets an isolated profile. This avoids mixing cookies across platforms and makes reset/debug easier.

Default mode is visible browser (`headless: false`) because creator centers frequently require QR login, visual verification, or interactive upload controls. Headless may be supported as an advanced option only after visible mode is stable.

## Platform Flows

### WeChat Official Account

Primary path remains official API:

- Upload/rehost images.
- Create draft through API.
- Optionally submit publish.

Playwright fallback:

- Open WeChat Official Account backend.
- Detect login state.
- Navigate to draft editor or content management page.
- Fill title/content where possible.
- In `draft` mode, save draft.
- In `full-auto` mode, click publish only if all required fields are present and no verification dialog appears.

### Zhihu

- Open Zhihu article editor.
- Detect login state.
- Fill title.
- Fill rich body using clipboard paste first, then DOM fallback.
- Add topics when possible. If the topic picker requires disambiguation, return `needs-user-action`.
- In `draft` mode, save/leave as draft.
- In `full-auto` mode, click publish and wait for success URL or success toast.

### Bilibili

- Open Bilibili creator article page.
- Detect login state.
- Fill title, body, category, tags.
- Upload cover if payload has cover.
- In `draft` mode, save draft or stop before submit if no save button is available.
- In `full-auto` mode, click submit/publish and wait for result.

### Xiaohongshu

- Open Xiaohongshu creator publish page.
- Detect login state.
- Upload generated cover and image assets.
- Fill title, plaintext body, and topics.
- In `draft` mode, stop after successful fill because draft support can vary by account/page version.
- In `full-auto` mode, click publish and wait for success or review-state confirmation.

## Selectors and Stability

Selectors must be platform-specific modules rather than scattered strings. Each selector entry should include:

- semantic name
- primary selector
- fallback selectors
- optional text matcher
- failure message

The runner should prefer accessible roles and visible text when stable, then CSS selectors as fallback.

Each platform adapter should expose a small step list:

```ts
interface AutomationPlatformAdapter {
  readonly platformId: PlatformId;
  publish(page: Page, request: AutomationPublishRequest, ctx: AutomationContext): Promise<AutomationPublishReceipt>;
}
```

## Safety Rules

Full-auto publish is allowed only when:

- user enabled `full-auto` mode in settings;
- platform payload has no validation errors;
- required fields are filled and verified;
- no login, CAPTCHA, SMS, risk, or review confirmation blocker is present;
- final button text matches a known publish action for that platform.

If a blocker appears, the runner stops and returns `needs-user-action`; it does not attempt to work around it.

## Diagnostics

Every run writes a folder:

```text
data/automation-runs/{timestamp}-{platformId}/
  request.json
  receipt.json
  final.png
  failure.png
  trace.zip
  dom.html
```

`request.json` must redact secrets and avoid storing browser cookies. Payload text may be stored because it is the user's article content; the UI should disclose this.

## App Integration

Add settings:

- runner URL, default `http://127.0.0.1:8790`
- automation mode per platform: mock, assist, draft, full-auto
- browser mode: visible/headless
- open login browser button

Add publish flow:

- Keep current `syncToPlatforms` to generate payloads.
- For platforms configured as `draft` or `full-auto`, call runner `/automation/publish`.
- For WeChat, prefer existing official API when WeChat mode is `draft` or `publish`; use runner fallback only if user explicitly selects web automation.
- Store receipts in existing history.

## Testing

Unit tests:

- request/receipt validation
- selector helper fallback behavior
- runner route validation
- app bridge calls automation runner for selected platforms

Integration tests with local fixture pages:

- fake Zhihu editor page
- fake Bilibili editor page
- fake Xiaohongshu editor page
- fake blocking CAPTCHA/login page

The first implementation should not run tests against real platform pages in CI. Real-page tests are manual smoke tests because login state and DOM versions vary.

## Delivery Phases

Phase 1:

- Add runner package and HTTP API.
- Implement Playwright persistent session management.
- Implement fixture-page automation tests.
- Add app settings and bridge.
- Support dry-run/draft flows for Zhihu, Bilibili, Xiaohongshu fixture pages.

Phase 2:

- Implement real visible-browser flows for Zhihu, Bilibili, Xiaohongshu.
- Add diagnostics and failure screenshots.
- Add manual login bootstrap action.

Phase 3:

- Add explicit full-auto final-click mode.
- Add per-platform hard blockers and success detection.
- Add WeChat web-console fallback.

This order keeps the architecture testable before relying on fragile real creator-center DOMs.

