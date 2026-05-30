/** 健康检查 + 出口 IP 查询(供公众号白名单提示)。 */
import type { FastifyInstance } from "fastify";
import type { ServerConfig } from "../config.js";

export function registerHealthRoutes(app: FastifyInstance, config: ServerConfig): void {
  app.get("/health", async () => {
    let outboundIp = "unknown";
    try {
      // 查询本机出口公网 IP,提示用户加入公众号 IP 白名单。
      const res = await fetch("https://api.ipify.org?format=json");
      const data = (await res.json()) as { ip?: string };
      outboundIp = data.ip ?? "unknown";
    } catch {
      outboundIp = "查询失败(无网络或被拦截)";
    }
    return {
      ok: true,
      wechatConfigured: config.wechat.configured,
      outboundIp,
      hint: config.wechat.configured
        ? `若真实发布报 errcode 40164,请把出口 IP「${outboundIp}」加入公众号后台 IP 白名单`
        : "未配置公众号 AppID/Secret,仅支持模拟发布;在 .env 配置后可真实调用草稿 API",
    };
  });
}
