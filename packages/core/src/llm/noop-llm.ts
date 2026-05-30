/** 默认 LLM 适配器:透传输入(无 key 时使用,保证全流程可运行)。 */
import type { LlmAdapter, LlmRequest } from "./types.js";

export class NoopLlm implements LlmAdapter {
  readonly id = "noop";
  readonly available = false;

  async run(req: LlmRequest): Promise<string> {
    return req.input;
  }
}

/** 全局默认实例。 */
export const noopLlm = new NoopLlm();
