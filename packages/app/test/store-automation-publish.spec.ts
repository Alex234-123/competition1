import { beforeEach, describe, expect, test, vi } from "vitest";
import { useStore } from "../src/state/store.js";
import type {
  AssistedHandoffRequest,
  AssistedHandoffResult,
  AutomationPublishRequest,
  AutomationPublishResult,
  ClipboardPayload,
  PlatformBridge,
  UploadAssetRequest,
  UploadAssetResult,
  WechatPublishRequest,
  WechatPublishResult,
} from "../src/bridge/types.js";

class AutomationBridge implements PlatformBridge {
  readonly env = "web" as const;
  readonly publishAutomation = vi.fn(async (req: AutomationPublishRequest): Promise<AutomationPublishResult> => ({
    ok: true,
    status: req.mode === "full-auto" ? "published" : "drafted",
    message: `${req.platformId} runner published`,
    remoteUrl: "https://example.test/real-post",
  }));

  async writeClipboard(_payload: ClipboardPayload): Promise<boolean> {
    return true;
  }

  async assistedHandoff(_req: AssistedHandoffRequest): Promise<AssistedHandoffResult> {
    return { ok: true, method: "clipboard", message: "ok" };
  }

  async publishWechat(_req: WechatPublishRequest): Promise<WechatPublishResult> {
    return { ok: false, message: "not used" };
  }

  async uploadAsset(_req: UploadAssetRequest): Promise<UploadAssetResult> {
    return { ok: false, message: "not used" };
  }

  async getSetting(_key: string): Promise<string | undefined> {
    return undefined;
  }

  async setSetting(_key: string, _value: string): Promise<void> {
    return undefined;
  }
}

describe("store publishAll - Playwright automation runner", () => {
  beforeEach(() => {
    useStore.setState({
      markdown: "# 自动发布标题\n\n这是一篇用于测试 Playwright runner 的内容。",
      authorName: "测试作者",
      tags: ["测试"],
      selectedPlatforms: ["zhihu", "bilibili"],
      results: [],
      receipts: {},
      publishing: false,
      bridge: null,
      serverUrl: "http://127.0.0.1:8787",
      runnerUrl: "http://127.0.0.1:8790",
      uploadedAssets: {},
      llm: { baseUrl: "", apiKey: "", model: "" },
      enhance: {},
      wechatPublishMode: "mock",
      automationModes: { zhihu: "full-auto", bilibili: "mock" },
      drafts: [],
      currentDraftId: null,
      history: [],
    } as Partial<ReturnType<typeof useStore.getState>>);
  });

  test("calls runner for full-auto platforms while leaving others on mock publish", async () => {
    const bridge = new AutomationBridge();
    useStore.setState({ bridge } as Partial<ReturnType<typeof useStore.getState>>);

    await useStore.getState().publishAll();

    expect(bridge.publishAutomation).toHaveBeenCalledTimes(1);
    expect(bridge.publishAutomation.mock.calls[0]?.[0]).toMatchObject({
      runnerUrl: "http://127.0.0.1:8790",
      platformId: "zhihu",
      mode: "full-auto",
      payload: {
        title: "自动发布标题",
        content: expect.stringContaining("Playwright runner"),
      },
    });
    expect(useStore.getState().receipts.zhihu).toBe("zhihu runner published");
    expect(useStore.getState().receipts.bilibili).toContain("模拟发布成功");
  });
});
