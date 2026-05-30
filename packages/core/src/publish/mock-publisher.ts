/**
 * 模拟发布器 —— 所有平台的默认发布器。
 *
 * stage:产出暂存产物(序列化主体 + 发布指引)。
 * confirm:不触网,返回模拟回执(假装提交成功,给一个本地预览链接占位)。
 * 它既是测试替身,也是生产环境的"辅助交接"产物来源 —— 同一条代码路径。
 */
import type { SerializedPayload } from "../adapters/types.js";
import { instructionsFor } from "./instructions.js";
import type { PublishArtifact, PublishContext, Publisher, PublishReceipt } from "./types.js";

const PLATFORM_NAMES: Record<string, string> = {
  wechat: "微信公众号",
  zhihu: "知乎",
  bilibili: "B站专栏",
  xiaohongshu: "小红书",
};

export class MockPublisher implements Publisher {
  readonly kind = "mock";

  stage(payload: SerializedPayload, ctx: PublishContext): PublishArtifact {
    return {
      platformId: ctx.platformId,
      payload,
      deliverable: payload.content,
      instructions: instructionsFor(ctx.platformId),
    };
  }

  async confirm(artifact: PublishArtifact, ctx: PublishContext): Promise<PublishReceipt> {
    const name = PLATFORM_NAMES[artifact.platformId] ?? artifact.platformId;
    return {
      platformId: artifact.platformId,
      status: "mock",
      message: `模拟发布成功:已生成《${artifact.payload.title}》的${name}适配产物`,
      previewUrl: `mock://${artifact.platformId}/preview`,
      at: ctx.now(),
    };
  }
}
