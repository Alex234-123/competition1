/** 真实 HTTP 客户端 —— 用 Node 原生 fetch 调用微信 API。 */

export async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // 微信接口对中文要求不转义 unicode,这里直接传 UTF-8 JSON。
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  return res.json();
}
