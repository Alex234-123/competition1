/** server 配置 —— 从环境变量读取公众号凭据 + 图床配置,校验存在性。 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(packageRoot, ".env") });

/** 图床后端类型:local=落盘静态服务,s3=对象存储,wechat=微信永久素材。 */
export type ImageHostKind = "local" | "s3" | "wechat";

export interface S3Config {
  readonly endpoint: string;
  readonly region: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** 公开访问基址(CDN/自定义域),最终 URL = publicBaseUrl + "/" + key。 */
  readonly publicBaseUrl: string;
  readonly configured: boolean;
}

export interface ServerConfig {
  readonly port: number;
  readonly wechat: {
    readonly appId: string;
    readonly secret: string;
    /** 凭据是否齐全(否则真实发布不可用,回退提示)。 */
    readonly configured: boolean;
  };
  readonly imageHost: {
    /** 默认图床后端(本机开发用 local)。 */
    readonly kind: ImageHostKind;
    /** local 图床落盘目录(相对 server 包根)。 */
    readonly localDir: string;
    /** local 图床公开基址(部署公网时改为对外域名)。 */
    readonly localBaseUrl: string;
    readonly s3: S3Config;
  };
}

export function loadConfig(): ServerConfig {
  const appId = process.env["WECHAT_APPID"]?.trim() ?? "";
  const secret = process.env["WECHAT_SECRET"]?.trim() ?? "";
  const port = Number(process.env["PORT"] ?? 8787);

  const s3 = {
    endpoint: process.env["S3_ENDPOINT"]?.trim() ?? "",
    region: process.env["S3_REGION"]?.trim() ?? "auto",
    bucket: process.env["S3_BUCKET"]?.trim() ?? "",
    accessKeyId: process.env["S3_ACCESS_KEY_ID"]?.trim() ?? "",
    secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"]?.trim() ?? "",
    publicBaseUrl: (process.env["S3_PUBLIC_BASE_URL"]?.trim() ?? "").replace(/\/$/, ""),
  };
  const s3Configured = !!(s3.endpoint && s3.bucket && s3.accessKeyId && s3.secretAccessKey && s3.publicBaseUrl);

  const kind = (process.env["IMAGE_HOST"]?.trim() as ImageHostKind) || "local";

  return {
    port,
    wechat: {
      appId,
      secret,
      configured: appId.length > 0 && secret.length > 0,
    },
    imageHost: {
      kind,
      localDir: process.env["IMAGE_LOCAL_DIR"]?.trim() ?? "data/uploads",
      localBaseUrl: (process.env["IMAGE_LOCAL_BASE_URL"]?.trim() ?? `http://127.0.0.1:${port}`).replace(/\/$/, ""),
      s3: { ...s3, configured: s3Configured },
    },
  };
}
