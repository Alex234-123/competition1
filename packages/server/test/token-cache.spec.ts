import { describe, it, expect, vi } from "vitest";
import { TokenCache } from "../src/wechat/token-cache.js";

describe("TokenCache —— 并发刷新锁", () => {
  it("并发 get 只触发一次 stable_token 刷新(in-flight 复用)", async () => {
    let calls = 0;
    const fetchJson = vi.fn(async () => {
      calls += 1;
      // 模拟网络延迟,让多个 get 在刷新进行中同时到达。
      await new Promise((r) => setTimeout(r, 20));
      return { access_token: "TOKEN_A", expires_in: 7200 };
    });
    const cache = new TokenCache("appid", "secret", fetchJson);

    const [a, b, c] = await Promise.all([cache.get(), cache.get(), cache.get()]);
    expect(a).toBe("TOKEN_A");
    expect(b).toBe("TOKEN_A");
    expect(c).toBe("TOKEN_A");
    expect(calls).toBe(1); // 三个并发请求只刷新一次
  });

  it("缓存有效期内复用,不重复刷新", async () => {
    let calls = 0;
    const fetchJson = vi.fn(async () => {
      calls += 1;
      return { access_token: `TOKEN_${calls}`, expires_in: 7200 };
    });
    const cache = new TokenCache("appid", "secret", fetchJson);

    const first = await cache.get();
    const second = await cache.get();
    expect(first).toBe("TOKEN_1");
    expect(second).toBe("TOKEN_1"); // 命中缓存
    expect(calls).toBe(1);
  });

  it("刷新失败后下次 get 能重试(不会卡在失败的 in-flight)", async () => {
    let calls = 0;
    const fetchJson = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return { errcode: 40013, errmsg: "invalid appid" };
      return { access_token: "TOKEN_OK", expires_in: 7200 };
    });
    const cache = new TokenCache("appid", "secret", fetchJson);

    await expect(cache.get()).rejects.toThrow("获取 access_token 失败");
    // in-flight 已清除,可重试。
    const token = await cache.get();
    expect(token).toBe("TOKEN_OK");
    expect(calls).toBe(2);
  });
});
