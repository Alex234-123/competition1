/** 本地落盘图床 —— 把图片写入磁盘目录,经 @fastify/static 暴露为公开 URL。
 *
 * 部署到公网服务器时,localBaseUrl 指向对外域名即成为真实图床。
 * 本机开发时作为零配置兜底(无需任何对象存储凭据即可端到端跑通)。
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import type { ImageHost, ImageUploadResult } from "@mpp/core";

export class LocalImageHost implements ImageHost {
  readonly id = "local";

  /**
   * @param dir 落盘目录(相对 server 包根或绝对路径)
   * @param baseUrl 公开访问基址(最终 URL = baseUrl + "/uploads/" + filename)
   */
  constructor(
    private readonly dir: string,
    private readonly baseUrl: string,
  ) {}

  async upload(bytes: Uint8Array, filename: string, _mime: string): Promise<ImageUploadResult> {
    const absDir = resolve(this.dir);
    await mkdir(absDir, { recursive: true });
    // 内容哈希前缀防止重名覆盖,保留原扩展名。
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const safeName = `${hash}-${filename.replace(/[^\w.-]/g, "_")}`;
    await writeFile(join(absDir, safeName), bytes);
    return { url: `${this.baseUrl}/uploads/${safeName}` };
  }
}
