import { describe, it, expect } from "vitest";
import {
  buildStableTokenRequest,
  buildDraftArticle,
  buildDraftAddRequest,
  buildFreepublishRequest,
  uploadImgUrl,
  addMaterialUrl,
  explainWechatError,
} from "../src/publish/wechat-official-api.js";
import type { SerializedPayload } from "../src/adapters/types.js";

const payload: SerializedPayload = {
  content: "<section>正文</section>",
  mime: "text/html",
  title: "标题",
  summary: "摘要",
  tags: ["标签"],
  imageAssetIds: [],
  extra: { author: "作者", contentSourceUrl: "https://src.example.com" },
};

describe("公众号官方 API 请求构造", () => {
  it("stable_token 请求结构正确", () => {
    const req = buildStableTokenRequest("APPID", "SECRET");
    expect(req.url).toBe("https://api.weixin.qq.com/cgi-bin/stable_token");
    expect(req.body).toEqual({
      grant_type: "client_credential",
      appid: "APPID",
      secret: "SECRET",
      force_refresh: false,
    });
  });

  it("draft 文章对象从 payload 派生,thumb_media_id 注入", () => {
    const article = buildDraftArticle(payload, "MEDIA123");
    expect(article).toMatchObject({
      article_type: "news",
      title: "标题",
      author: "作者",
      digest: "摘要",
      content: "<section>正文</section>",
      content_source_url: "https://src.example.com",
      thumb_media_id: "MEDIA123",
    });
  });

  it("draft/add 请求带 access_token 与 articles 数组", () => {
    const article = buildDraftArticle(payload, "M1");
    const req = buildDraftAddRequest("TOKEN", [article]);
    expect(req.url).toContain("/draft/add?access_token=TOKEN");
    expect(req.body).toEqual({ articles: [article] });
  });

  it("freepublish/submit 请求带 media_id", () => {
    const req = buildFreepublishRequest("TOKEN", "DRAFT1");
    expect(req.url).toContain("/freepublish/submit?access_token=TOKEN");
    expect(req.body).toEqual({ media_id: "DRAFT1" });
  });

  it("图片/素材上传 URL 携带 token", () => {
    expect(uploadImgUrl("T")).toContain("/media/uploadimg?access_token=T");
    expect(addMaterialUrl("T")).toContain("/material/add_material?access_token=T&type=image");
  });

  it("access_token 不出现在请求体(secret 仅在 stable_token)", () => {
    const req = buildDraftAddRequest("TOKEN", []);
    expect(JSON.stringify(req.body)).not.toContain("SECRET");
  });

  it("错误码解读", () => {
    expect(explainWechatError(40164)).toContain("白名单");
    expect(explainWechatError(40007)).toContain("永久素材");
    expect(explainWechatError(99999)).toContain("未知");
  });
});
