/** 公众号真实发布路由 —— 接收 payload,调用官方草稿 API。 */
import type { FastifyInstance } from "fastify";
import type { ServerConfig } from "../config.js";
import { WechatPublisher, type WechatPublishPayload } from "../wechat/rehost.js";

export function registerWechatRoutes(app: FastifyInstance, config: ServerConfig): void {
  app.post("/wechat/publish", async (request, reply) => {
    if (!config.wechat.configured) {
      return reply.send({
        ok: false,
        message: "server 未配置公众号凭据(.env 的 WECHAT_APPID/WECHAT_SECRET);请改用模拟发布。",
      });
    }
    const payload = request.body as WechatPublishPayload;
    if (!payload?.title || !payload?.content) {
      return reply.code(400).send({ ok: false, message: "缺少 title 或 content" });
    }
    const publisher = new WechatPublisher(config.wechat.appId, config.wechat.secret);
    try {
      const outcome = await publisher.publish(payload);
      return reply.send(outcome);
    } catch (err) {
      return reply.send({
        ok: false,
        message: `发布异常: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
}
