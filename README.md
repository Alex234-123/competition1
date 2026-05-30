# 多平台内容发布工具

> 一份 Markdown，自动适配 **微信公众号 / 知乎 / B站专栏 / 小红书** 的格式与风格，一键发布（默认模拟）。

创作者把同一篇内容同步到多个平台时，逐个适配格式极其耗时：公众号过滤 `class`/外链、知乎公式要转图片、B站图片防盗链、小红书只认纯文本+话题标签且必须配图。本工具用**规范化中间表示（IR）+ 能力声明式适配器**，让你写一次内容，自动产出四个平台的合规产物，并保留**零改核心扩展更多平台**的架构。

---

## 快速上手

```bash
npm install

# M1 零密钥闭环演示:样例 MD → 四平台产物落盘 dist/demo/
npm run demo

# M2 交互式 Web 工具(主演示路径,无需扩展/密钥)
npm run dev          # 打开 http://localhost:5176

# 全量单测 + 类型检查
npm test
npm run typecheck

# M3 打包 MV3 浏览器扩展 → dist-ext/(Chrome 加载已解压扩展)
npm run build:ext

# M4 可选服务端(仅公众号真实发布时需要,默认不启)
npm run server       # 需先在 packages/server 配置 .env
```

`npm run demo` 后查看 `dist/demo/`：`wechat.html`（内联样式、无 class/外链图）、`zhihu.html`（公式图片+保留外链）、`bilibili.html`（受限 HTML+分区）、`xiaohongshu.txt`（纯文本+#话题#+违禁词替换）、各平台 `*-cover.svg` 封面、`report.json`（校验与回执详情）。

---

## 架构总览

monorepo（npm workspaces），三包 + 演示脚本：

| 包 | 职责 | 依赖环境 |
|---|---|---|
| **packages/core** | 纯 TS、零 DOM。IR 类型、MD→IR 解析、能力驱动变换库、适配器注册表+四平台适配器、校验器、两阶段 Publisher、同步引擎、LLM 接口 | 无（可被 app/server 共用） |
| **packages/app** | 一套 React UI **双构建**：`dev` 即完整 Web 工具，`build:ext` 即 MV3 扩展。通过 `PlatformBridge` 隔离 `chrome.*` | 浏览器 |
| **packages/server** | 可选 Fastify 服务端，默认不启。持公众号密钥、跑 token 缓存、图片重托管、草稿 API | Node 20+ |

### 核心数据流

```
Markdown
  → IR Document (AST + 元数据 + 资产表)        ← 核心永不持有平台 HTML
  → 每平台:
      preprocess(能力驱动降级管线)  IR → IR     ← 纯函数变换,按缺失能力选择
      serialize(平台原生格式)       IR → 产物    ← 公众号内联HTML/知乎富文本/B站受限HTML/小红书纯文本
      validate(按 capabilities)                ← 长度/必须图/违禁词
      Publisher.stage() → 暂存产物
      Publisher.confirm() → 回执
```

### 关键设计：能力声明式适配器

每个平台只**声明它缺什么能力**，变换管线据此自动降级，核心**绝无 `switch(platform)`**：

| 平台 | contentModel | 外链 | 表格 | 公式 | 必须封面 | 字数计数 | 违禁词过滤 |
|---|---|---|---|---|---|---|---|
| 微信公众号 | `inline-html` | ❌→脚注 | ✅ | ❌ | 否 | 普通 | 否 |
| 知乎 | `rich-clipboard` | ✅ | ✅ | 图片(equation) | 否 | 普通 | 否 |
| B站专栏 | `restricted-html` | ✅ | ❌→图片 | 图片 | 否 | 普通 | 否 |
| 小红书 | `plaintext` | ❌→脚注 | ❌→图片 | ❌ | ✅ | **字素簇** | ✅ |

> 小红书标题≤20/正文≤1000 用 `Intl.Segmenter` 按**字素簇**计数（emoji、组合字符算一个），而非 `string.length`。

---

## 扩展新平台（零改核心）

加一个平台只需 **实现一个 adapter + 注册一行**，变换库/校验器/同步引擎/UI 全部零改动：

```typescript
// packages/core/src/adapters/myplatform/index.ts
import { BaseAdapter } from "../base-adapter.js";
import type { Capabilities, Document, PlatformOverride } from "../../ir/types.js";
import type { SerializedPayload } from "../types.js";

const CAPABILITIES: Capabilities = {
  contentModel: "markdown",        // 该平台原生支持 Markdown
  supportsExternalLinks: true,
  supportsTables: true,
  supportsMath: "none",
  supportsCodeBlocks: "native",
  requiresCover: false,
  requiresImageRehost: false,
  countByGrapheme: false,
  bannedWordFilter: false,
  taxonomy: "free-tags",           // "free-tags" | "entity-topics" | "category+tags"
  limits: { titleMax: 50, bodyMax: 20000, tagsMax: 5 },
  publishers: ["mock"],
};

export class MyPlatformAdapter extends BaseAdapter {
  readonly id = "myplatform";
  readonly name = "我的平台";
  readonly capabilities = CAPABILITIES;

  serialize(doc: Document, override?: PlatformOverride): SerializedPayload {
    // preprocess(降级管线)已由 BaseAdapter 按 capabilities 自动跑过
    // 这里只需把降级后的 IR 序列化成平台原生格式
    return { /* content, mime, title, tags, imageAssetIds, ... */ };
  }
}
```

```typescript
// packages/core/src/adapters/registry.ts —— 只加这一行
registerAdapter(new MyPlatformAdapter());
```

`preprocess` 由 `BaseAdapter` 根据 `capabilities` 自动选择并运行降级变换（外链→脚注、表格→图片、公式→图片、违禁词替换、扁平化纯文本…）。你声明缺什么能力，管线就补什么降级。

---

## 智能改写：规则式为主，预留 LLM 接口

- **规则式（默认，零密钥即可全功能）**：能力驱动的纯函数变换库完成所有格式/风格适配。
- **LLM 接口（可选增强）**：`packages/core/src/llm/` 定义 `LlmAdapter`（标题优化/摘要/口语化），默认 `NoopLlm` 透传。配置 key 后可接入真实模型，无 key 不影响任何功能。

---

## 一键发布与辅助发布

- **默认全平台模拟发布**：`stage→confirm` 两阶段产出暂存产物+回执，安全可演示。
- **公众号保留真实官方 API**：仅公众号有面向开发者的发布 API，链路为 `stable_token → 图片重托管 → draft/add`。
- **扩展辅助发布**：content script 默认**写富文本到剪贴板**（`ClipboardItem` 同时给 `text/html`+`text/plain`），并额外尝试 **best-effort 注入**目标平台编辑器，失败自动降级回复制粘贴，**绝不自动点击「发布」**。

> 知乎/B站/小红书对普通开发者**无发布 API**，非官方 cookie/RPA 有 ToS 与封号风险，故「模拟/暂存为默认」是唯一稳妥姿态。

---

## 安全边界（公众号真实发布）

- **`AppSecret` 只存在于 `packages/server/.env`**（被 `.gitignore` 排除），扩展/Web 永远拿不到，也绝不写入任何提交文件。
- 扩展/Web 用 core 只**构造 payload**，POST 给 localhost server；server 持密钥跑 `stable_token`（7200s，提前 5 分钟刷新）→ 图片重托管 → 草稿 API。
- `access_token` 只在 server 内存，绝不返回前端。
- **现实障碍**：公众号 API 调用 IP 必须在后台白名单，本机动态 IP 常加不进 → 默认走模拟；`/health` 会返回出口 IP 供白名单参考，真实发布失败时返回清晰的 `errcode` 解释（如 40164 白名单、40007 永久素材）。

启用真实发布：

```bash
cd packages/server
cp .env.example .env      # 填入 WECHAT_APPID / WECHAT_SECRET
cd ../.. && npm run server # http://127.0.0.1:8787，仅 localhost
curl http://127.0.0.1:8787/health   # 查看出口 IP 与配置状态
```

---

## 测试与验证

| 验证 | 命令 | 覆盖 |
|---|---|---|
| 单测（65 个） | `npm test` | MD→IR 解析、各变换纯函数、字素簇计数、校验规则、四适配器序列化、公众号 API 请求构造（注入 mock fetch） |
| 类型检查 | `npm run typecheck` | core/app/server 三包 strict |
| M1 闭环 | `npm run demo` | 四平台产物落盘 + 校验 + 回执 |
| M2 交互 | `npm run dev` | 浏览器实时预览/校验/模拟发布/Canvas 封面 |
| M3 扩展 | `npm run build:ext` | MV3 产物 dist-ext，Chrome 加载已解压扩展 |

> UI/扩展为前端，类型检查与单测保证**代码正确性**；**功能正确性**（编辑器注入、真实发布）需在浏览器实际操作验证，依赖真实平台登录态的部分无法自动化。

---

## 目录结构

```
packages/core/src/
├── ir/          # IR 契约:Document/Block/Inline/Asset/Capabilities
├── parse/       # markdown-it → IR
├── transforms/  # 能力驱动降级变换库(纯函数 IR→IR)+ 管线 + 注册表
├── adapters/    # 适配器注册表 + 四平台(capabilities + serialize)
├── validate/    # 按 capabilities 校验
├── publish/     # 两阶段 Publisher(Mock + 公众号官方 API 构造)
├── llm/         # LlmAdapter 接口(默认 noop)
└── sync/        # 有界并发同步引擎,各平台独立成败上报

packages/app/src/
├── bridge/      # PlatformBridge 抽象(mock-bridge / chrome-bridge)
├── components/  # 输入 + 四平台预览 + 校验提示 + 回执
├── render/      # Canvas 封面渲染
├── content/     # content script:辅助发布(复制粘贴 + best-effort 注入)
└── background/  # MV3 service worker

packages/server/src/
├── routes/      # /health(出口IP) /wechat/publish
├── wechat/      # token 缓存 / 原生 fetch / 图片重托管 + 草稿
└── config.ts    # 读 env、校验凭据
```
