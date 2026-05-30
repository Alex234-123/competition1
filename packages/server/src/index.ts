/**
 * server 入口 —— Fastify,仅 localhost,CORS 限扩展/本地来源。
 *
 * 默认不需要它(全平台模拟发布);仅当配置公众号凭据并需真实发布时启动。
 * 启动:在 packages/server 复制 .env.example 为 .env 填入凭据,然后 npm run server。
 */
import Fastify from "fastify";
import type { FastifyError } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { loadConfig } from "./config.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerWechatRoutes } from "./routes/wechat.js";
import { registerUploadRoutes } from "./routes/upload.js";
import { createImageHost } from "./imagehost/factory.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = Fastify({
    // 每个请求分配 reqId(优先用上游 x-request-id),贯穿该请求所有日志行。
    genReqId: (req) => {
      const header = req.headers["x-request-id"];
      return (Array.isArray(header) ? header[0] : header) ?? crypto.randomUUID();
    },
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
      // 请求级结构化日志:记录方法/路径/状态/耗时。
      serializers: {
        req(req) {
          return { method: req.method, url: req.url };
        },
      },
    },
  });

  // 请求完成时记录耗时(结构化:reqId 由 Fastify 自动附加)。
  app.addHook("onResponse", (req, reply, done) => {
    req.log.info({ statusCode: reply.statusCode, ms: Math.round(reply.elapsedTime) }, "请求完成");
    done();
  });

  // 限流:防止本地 server 被异常高频调用打满(默认每分钟 120 次/IP)。
  await app.register(rateLimit, {
    max: Number(process.env["RATE_LIMIT_MAX"] ?? 120),
    timeWindow: "1 minute",
  });

  // CORS:允许扩展(chrome-extension://)与本地开发页面调用。
  await app.register(cors, {
    origin: [/^chrome-extension:\/\//, /^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  });

  // multipart:接收图片上传(限制单文件 10MB)。
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // 静态服务:暴露 local 图床落盘目录为 /uploads/*。
  const uploadsDir = resolve(config.imageHost.localDir);
  await mkdir(uploadsDir, { recursive: true });
  await app.register(fastifyStatic, { root: uploadsDir, prefix: "/uploads/" });

  // 图床(按配置选择 local/s3)。
  const imageHost = createImageHost(config, (msg) => app.log.warn(msg));

  // 统一错误 envelope:所有未捕获异常返回 { ok:false, error, statusCode },避免泄露堆栈。
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const statusCode = err.statusCode ?? 500;
    // 5xx 记完整错误(含堆栈)便于排查;4xx 只记简要信息。
    if (statusCode >= 500) req.log.error({ err }, "请求处理失败");
    else req.log.warn({ msg: err.message }, "请求被拒绝");
    void reply.status(statusCode).send({
      ok: false,
      error: err.message || "内部错误",
      statusCode,
    });
  });

  // 404 统一 envelope。
  app.setNotFoundHandler((req, reply) => {
    void reply.status(404).send({ ok: false, error: `未找到路由 ${req.method} ${req.url}`, statusCode: 404 });
  });

  registerHealthRoutes(app, config);
  registerWechatRoutes(app, config);
  registerUploadRoutes(app, imageHost);

  try {
    await app.listen({ port: config.port, host: "127.0.0.1" });
    app.log.info(
      `多平台发布工具 server 已启动:http://127.0.0.1:${config.port}  ` +
        `公众号凭据:${config.wechat.configured ? "已配置" : "未配置(仅模拟)"}  ` +
        `图床:${imageHost.id}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
