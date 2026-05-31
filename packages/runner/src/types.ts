import type { SerializedPayload } from "@mpp/core";

export const automationModes = ["draft", "full-auto"] as const;
export type AutomationMode = (typeof automationModes)[number];

export const automationPlatformIds = ["wechat", "zhihu", "bilibili", "xiaohongshu"] as const;
export type AutomationPlatformId = (typeof automationPlatformIds)[number];

export const automationStatuses = ["drafted", "published", "needs-user-action", "failed"] as const;
export type AutomationStatus = (typeof automationStatuses)[number];

export interface AutomationOptions {
  readonly headless?: boolean;
  readonly slowMoMs?: number;
  readonly timeoutMs?: number;
  readonly profileDir?: string;
}

export interface AutomationPublishRequest {
  readonly platformId: AutomationPlatformId;
  readonly mode: AutomationMode;
  readonly payload: SerializedPayload;
  readonly options?: AutomationOptions;
}

export interface AutomationPublishReceipt {
  readonly ok: boolean;
  readonly status: AutomationStatus;
  readonly message: string;
  readonly remoteUrl?: string;
  readonly screenshotPath?: string;
  readonly tracePath?: string;
  readonly diagnosticsPath?: string;
}

export function isAutomationMode(value: unknown): value is AutomationMode {
  return typeof value === "string" && automationModes.includes(value as AutomationMode);
}

export function isAutomationPlatformId(value: unknown): value is AutomationPlatformId {
  return typeof value === "string" && automationPlatformIds.includes(value as AutomationPlatformId);
}

export function isAutomationStatus(value: unknown): value is AutomationStatus {
  return typeof value === "string" && automationStatuses.includes(value as AutomationStatus);
}

export function parseAutomationPublishRequest(value: unknown): AutomationPublishRequest {
  if (!isRecord(value)) {
    throw new Error("request body must be an object");
  }
  if (!isAutomationPlatformId(value.platformId)) {
    throw new Error("unsupported platformId");
  }
  if (!isAutomationMode(value.mode)) {
    throw new Error("unsupported automation mode");
  }
  if (!isRecord(value.payload)) {
    throw new Error("payload must be an object");
  }

  const options = value.options === undefined ? undefined : parseAutomationOptions(value.options);
  return {
    platformId: value.platformId,
    mode: value.mode,
    payload: value.payload as unknown as SerializedPayload,
    ...(options ? { options } : {}),
  };
}

export function isAutomationPublishReceipt(value: unknown): value is AutomationPublishReceipt {
  return (
    isRecord(value) &&
    typeof value.ok === "boolean" &&
    isAutomationStatus(value.status) &&
    typeof value.message === "string" &&
    optionalString(value.remoteUrl) &&
    optionalString(value.screenshotPath) &&
    optionalString(value.tracePath) &&
    optionalString(value.diagnosticsPath)
  );
}

function parseAutomationOptions(value: unknown): AutomationOptions {
  if (!isRecord(value)) {
    throw new Error("options must be an object");
  }

  const out: AutomationOptions = {
    ...(value.headless === undefined ? {} : { headless: mustBoolean(value.headless, "options.headless") }),
    ...(value.slowMoMs === undefined ? {} : { slowMoMs: mustNumber(value.slowMoMs, "options.slowMoMs") }),
    ...(value.timeoutMs === undefined ? {} : { timeoutMs: mustNumber(value.timeoutMs, "options.timeoutMs") }),
    ...(value.profileDir === undefined ? {} : { profileDir: mustString(value.profileDir, "options.profileDir") }),
  };
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function mustString(value: unknown, name: string): string {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  return value;
}

function mustBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
  return value;
}

function mustNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return value;
}
