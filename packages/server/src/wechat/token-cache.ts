/**
 * stable_token 缓存 —— 公众号 access_token 管理。
 *
 * 有效期 7200s,提前 5 分钟主动刷新(微信在倒计时 5 分钟内会发新 token,新旧共存)。
 * token 只在 server 内存,绝不返回给前端。
 */
import { WechatApi } from "@mpp/core";

interface CachedToken {
  token: string;
  expiresAt: number; // 毫秒时间戳
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class TokenCache {
  private cached: CachedToken | null = null;
  /** 进行中的刷新 Promise:并发请求复用同一次刷新,避免重复打 stable_token。 */
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly appId: string,
    private readonly secret: string,
    private readonly fetchJson: (url: string, body: unknown) => Promise<unknown>,
  ) {}

  /** 获取有效 token,过期或临近过期则刷新。 */
  async get(): Promise<string> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt - now > REFRESH_MARGIN_MS) {
      return this.cached.token;
    }
    // 已有刷新在途则复用,杜绝并发重复刷新。
    if (this.inflight) return this.inflight;
    this.inflight = this.refresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async refresh(): Promise<string> {
    const req = WechatApi.buildStableTokenRequest(this.appId, this.secret);
    const res = (await this.fetchJson(req.url, req.body)) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
    };
    if (!res.access_token) {
      throw new Error(`获取 access_token 失败: errcode=${res.errcode} ${res.errmsg ?? ""}`);
    }
    this.cached = {
      token: res.access_token,
      expiresAt: Date.now() + (res.expires_in ?? 7200) * 1000,
    };
    return this.cached.token;
  }
}
