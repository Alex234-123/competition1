/** 图片上传路由 —— 接收 multipart 文件,经配置图床上传,返回公开 URL/mediaId。 */
import type { FastifyInstance } from "fastify";
import type { ImageHost } from "@mpp/core";

export function registerUploadRoutes(app: FastifyInstance, host: ImageHost): void {
  app.post("/upload", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ ok: false, message: "未收到文件(需 multipart/form-data)" });
    }
    const mime = data.mimetype || "image/png";
    if (!mime.startsWith("image/")) {
      return reply.code(400).send({ ok: false, message: `仅支持图片,收到 ${mime}` });
    }
    try {
      const buffer = await data.toBuffer();
      const bytes = new Uint8Array(buffer);
      const result = await host.upload(bytes, data.filename || "upload.png", mime);
      return reply.send({ ok: true, ...result, host: host.id });
    } catch (err) {
      return reply.code(502).send({
        ok: false,
        message: `上传失败: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  });
}
