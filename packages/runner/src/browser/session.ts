import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type BrowserContext } from "playwright";
import type { AutomationPlatformId } from "../types.js";

export interface BrowserSessionOptions {
  readonly profilesRoot: string;
  readonly platformId: AutomationPlatformId;
  readonly profileDir?: string;
  readonly headless?: boolean;
  readonly slowMoMs?: number;
}

export function resolveProfileDir(root: string, platformId: AutomationPlatformId, override?: string): string {
  return resolve(override ?? resolve(root, platformId));
}

export class BrowserSessionManager {
  private readonly contexts = new Map<AutomationPlatformId, BrowserContext>();

  async open(options: BrowserSessionOptions): Promise<BrowserContext> {
    const existing = this.contexts.get(options.platformId);
    if (existing) return existing;

    const profileDir = resolveProfileDir(options.profilesRoot, options.platformId, options.profileDir);
    await mkdir(profileDir, { recursive: true });
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: options.headless ?? false,
      slowMo: options.slowMoMs,
      viewport: { width: 1366, height: 900 },
    });
    this.contexts.set(options.platformId, context);
    return context;
  }

  async close(platformId?: AutomationPlatformId): Promise<void> {
    if (platformId) {
      const context = this.contexts.get(platformId);
      if (!context) return;
      await context.close();
      this.contexts.delete(platformId);
      return;
    }

    await Promise.all([...this.contexts.values()].map((context) => context.close()));
    this.contexts.clear();
  }
}
