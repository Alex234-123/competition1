/**
 * OpenAI 兼容 LLM 适配器 —— 走 /v1/chat/completions,一份实现通吃
 * OpenAI / DeepSeek / Kimi / Qwen / 本地 Ollama / vLLM 等。
 *
 * 安全:apiKey 由调用方注入(来自前端本地存储或 server env),core 不持久化、不记录。
 * 网络:fetch 可注入便于测试;无 key 时 available=false,sync 链路退化为不调用。
 */
import type { LlmAdapter, LlmRequest } from "./types.js";
import { buildPrompt } from "./prompt-templates.js";

export interface OpenAiCompatOptions {
  /** API 基址(到 /v1 级别,如 https://api.deepseek.com/v1)。 */
  readonly baseUrl: string;
  /** API key(无则适配器 available=false)。 */
  readonly apiKey: string;
  /** 模型名(如 deepseek-chat / gpt-4o-mini / qwen-plus)。 */
  readonly model: string;
  /** 注入的 fetch(测试用);缺省用全局 fetch。 */
  readonly fetchImpl?: typeof fetch;
  /** 采样温度,默认 0.7。 */
  readonly temperature?: number;
  /** 单次最大 token,默认 1024。 */
  readonly maxTokens?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export class OpenAiCompatLlm implements LlmAdapter {
  readonly id = "openai-compat";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: OpenAiCompatOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  get available(): boolean {
    return !!this.opts.apiKey && !!this.opts.baseUrl && !!this.opts.model;
  }

  async run(req: LlmRequest): Promise<string> {
    if (!this.available) return req.input; // 与 NoopLlm 一致:不可用即透传。
    const prompt = buildPrompt(req);
    const url = `${this.opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.opts.apiKey}`,
      },
      body: JSON.stringify({
        model: this.opts.model,
        messages: [
          { role: "system", content: "你是中文新媒体内容编辑助手,只输出改写结果,不加解释。" },
          { role: "user", content: prompt },
        ],
        temperature: this.opts.temperature ?? 0.7,
        max_tokens: this.opts.maxTokens ?? 1024,
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(`LLM 请求失败: HTTP ${res.status}`);
    }
    const data = (await res.json()) as ChatCompletionResponse;
    if (data.error?.message) {
      throw new Error(`LLM 返回错误: ${data.error.message}`);
    }
    const content = data.choices?.[0]?.message?.content;
    return content?.trim() || req.input; // 空响应回退原文,保证不破坏内容。
  }
}
