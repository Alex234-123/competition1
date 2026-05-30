/** S3 兼容对象存储图床 —— 接 Cloudflare R2 / 阿里云 OSS / MinIO 等。
 *
 * 填 .env 的 S3_* 后即用:上传到 bucket,返回 publicBaseUrl + key 的公开 URL。
 * 所有平台共享(URL 公开可访问,各平台 <img> 直接引用)。
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { ImageHost, ImageUploadResult } from "@mpp/core";
import type { S3Config } from "../config.js";

export class S3ImageHost implements ImageHost {
  readonly id = "s3";
  private readonly client: S3Client;

  constructor(private readonly cfg: S3Config) {
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      forcePathStyle: true, // MinIO/部分 S3 兼容服务需要。
    });
  }

  async upload(bytes: Uint8Array, filename: string, mime: string): Promise<ImageUploadResult> {
    const key = `mpp/${Date.now()}-${filename.replace(/[^\w.-]/g, "_")}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: bytes,
        ContentType: mime,
      }),
    );
    return { url: `${this.cfg.publicBaseUrl}/${key}` };
  }
}
