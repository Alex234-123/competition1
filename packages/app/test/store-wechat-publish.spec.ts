import { beforeEach, describe, expect, test, vi } from "vitest";
import { useStore } from "../src/state/store.js";
import type {
  AssistedHandoffRequest,
  AssistedHandoffResult,
  ClipboardPayload,
  PlatformBridge,
  UploadAssetRequest,
  UploadAssetResult,
  WechatPublishRequest,
  WechatPublishResult,
} from "../src/bridge/types.js";

class TestBridge implements PlatformBridge {
  readonly env = "web" as const;
  readonly publishWechat = vi.fn(async (_req: WechatPublishRequest): Promise<WechatPublishResult> => ({
    ok: true,
    message: "已创建公众号草稿",
    remoteId: "draft-media-id",
  }));

  async writeClipboard(_payload: ClipboardPayload): Promise<boolean> {
    return true;
  }

  async assistedHandoff(_req: AssistedHandoffRequest): Promise<AssistedHandoffResult> {
    return { ok: true, method: "clipboard", message: "ok" };
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

describe("store publishAll — WeChat real publish mode", () => {
  beforeEach(() => {
    useStore.setState({
      markdown: "# 可发布标题\n\n这是一篇用于测试真实公众号发布接线的内容。",
      authorName: "测试作者",
      tags: ["测试"],
      selectedPlatforms: ["wechat", "zhihu"],
      results: [],
      receipts: {},
      publishing: false,
      bridge: null,
      serverUrl: "http://127.0.0.1:8787",
      uploadedAssets: {},
      llm: { baseUrl: "", apiKey: "", model: "" },
      enhance: {},
      drafts: [],
      currentDraftId: null,
      history: [],
      wechatPublishMode: "mock",
    } as Partial<ReturnType<typeof useStore.getState>>);
  });

  test("calls bridge.publishWechat for WeChat while other platforms remain mock", async () => {
    const bridge = new TestBridge();
    useStore.setState({ bridge, wechatPublishMode: "draft" } as Partial<ReturnType<typeof useStore.getState>>);

    await useStore.getState().publishAll();

    expect(bridge.publishWechat).toHaveBeenCalledTimes(1);
    expect(bridge.publishWechat.mock.calls[0]?.[0]).toMatchObject({
      serverUrl: "http://127.0.0.1:8787",
      payload: {
        title: "可发布标题",
        content: expect.stringContaining("用于测试真实公众号发布接线"),
        publish: false,
      },
    });
    expect(useStore.getState().receipts.wechat).toBe("已创建公众号草稿");
    expect(useStore.getState().receipts.zhihu).toContain("模拟发布成功");
  });
});
