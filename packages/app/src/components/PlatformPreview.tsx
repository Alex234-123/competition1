import type { PlatformResult, ValidationIssue } from "@mpp/core";
import { useState } from "react";
import DOMPurify from "dompurify";

interface Props {
  result: PlatformResult;
}

const PLATFORM_COLORS: Record<string, string> = {
  wechat: "#07C160",
  zhihu: "#0084FF",
  bilibili: "#FB7299",
  xiaohongshu: "#FF2442",
};

// 单平台预览:渲染序列化产物 + 校验提示 + 发布指引。
export function PlatformPreview({ result }: Props) {
  const [tab, setTab] = useState<"preview" | "source" | "issues">("preview");
  const payload = result.artifact?.payload;
  const color = PLATFORM_COLORS[result.platformId] ?? "#666";
  if (!payload) {
    return <div className="preview-empty">{result.error ?? "无产物"}</div>;
  }

  const issues = result.report?.issues ?? [];
  const errCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="platform-preview">
      <div className="preview-head" style={{ borderColor: color }}>
        <span className="preview-name" style={{ color }}>
          {result.platformName}
        </span>
        <span className="preview-meta">
          {payload.mime === "text/html" ? "HTML" : "纯文本"} · {countChars(payload)} 字
          {errCount > 0 && <span className="badge badge-err">{errCount} 错误</span>}
          {warnCount > 0 && <span className="badge badge-warn">{warnCount} 提醒</span>}
        </span>
      </div>

      <div className="preview-tabs">
        <button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>
          预览
        </button>
        <button className={tab === "source" ? "active" : ""} onClick={() => setTab("source")}>
          源码
        </button>
        <button className={tab === "issues" ? "active" : ""} onClick={() => setTab("issues")}>
          校验 ({issues.length})
        </button>
      </div>

      <div className="preview-body">
        {tab === "preview" && <PreviewRender payload={payload} platformId={result.platformId} />}
        {tab === "source" && <pre className="preview-source">{payload.content}</pre>}
        {tab === "issues" && <IssueList issues={issues} instructions={result.artifact?.instructions ?? []} />}
      </div>
    </div>
  );
}

function PreviewRender({ payload, platformId }: { payload: NonNullable<PlatformResult["artifact"]>["payload"]; platformId: string }) {
  if (payload.mime === "text/plain") {
    // 小红书:模拟手机屏纯文本展示。
    return (
      <div className="xhs-phone">
        <div className="xhs-title">{payload.title}</div>
        <div className="xhs-body">{payload.content}</div>
      </div>
    );
  }
  // HTML:公众号用手机框,知乎/B站用普通容器。
  const isWechat = platformId === "wechat";
  // 纵深防御:产物虽已经 core sanitize,渲染前再过 DOMPurify(允许内联 style)。
  const safeHtml = DOMPurify.sanitize(payload.content, { ADD_ATTR: ["style"] });
  return (
    <div className={isWechat ? "wechat-phone" : "html-preview"}>
      <div className="html-title">{payload.title}</div>
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
}

function IssueList({
  issues,
  instructions,
}: {
  issues: readonly ValidationIssue[];
  instructions: readonly string[];
}) {
  return (
    <div className="issue-list">
      {issues.length === 0 && <div className="issue-ok">校验通过,无问题</div>}
      {issues.map((i, idx) => (
        <div key={idx} className={`issue issue-${i.severity}`}>
          <span className="issue-sev">{i.severity === "error" ? "⛔" : i.severity === "warning" ? "⚠️" : "ℹ️"}</span>
          <span>{i.message}</span>
        </div>
      ))}
      {instructions.length > 0 && (
        <div className="instructions">
          <div className="instructions-title">发布说明</div>
          {instructions.map((t, idx) => (
            <div key={idx} className="instruction-item">
              · {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function countChars(payload: NonNullable<PlatformResult["artifact"]>["payload"]): number {
  const text = payload.mime === "text/plain" ? payload.content : payload.content.replace(/<[^>]+>/g, "");
  return [...text].length;
}
