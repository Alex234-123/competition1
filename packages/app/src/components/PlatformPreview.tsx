import type { PlatformResult, ValidationIssue } from "@mpp/core";
import { memo, useState } from "react";
import DOMPurify from "dompurify";
import { XCircle, AlertTriangle, Info, CheckCircle2, ListChecks } from "lucide-react";
import { platformColor } from "./platform-meta.js";

interface Props {
  result: PlatformResult;
}

type Tab = "preview" | "source" | "issues";

// 单平台预览:渲染序列化产物 + 校验提示 + 发布指引。
// memo:仅当该平台的 result 引用变化才重渲染(避免父级全量订阅导致四卡齐刷)。
export const PlatformPreview = memo(function PlatformPreview({ result }: Props) {
  const [tab, setTab] = useState<Tab>("preview");
  const payload = result.artifact?.payload;
  const color = platformColor(result.platformId);
  if (!payload) {
    return (
      <div className="platform-preview" style={{ height: "auto" }}>
        <div className="preview-empty">
          <XCircle size={22} aria-hidden />
          {result.error ?? "无产物"}
        </div>
      </div>
    );
  }

  const issues = result.report?.issues ?? [];
  const errCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "preview", label: "预览" },
    { key: "source", label: "源码" },
    { key: "issues", label: `校验 (${issues.length})` },
  ];
  const tabBase = `pp-${result.platformId}`;

  // tablist 左右箭头切换(roving tabindex,符合 WAI-ARIA tabs 模式)。
  const onTabKey = (e: React.KeyboardEvent, key: Tab) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = tabs.findIndex((t) => t.key === key);
    const next = e.key === "ArrowRight" ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
    const nextKey = tabs[next].key;
    setTab(nextKey);
    document.getElementById(`${tabBase}-tab-${nextKey}`)?.focus();
  };

  return (
    <div className="platform-preview" style={{ ["--platform-color" as string]: color }}>
      <div className="preview-head">
        <span className="preview-name">
          <span className="preview-name-dot" aria-hidden />
          {result.platformName}
        </span>
        <span className="preview-meta">
          {payload.mime === "text/html" ? "HTML" : "纯文本"} · {countChars(payload)} 字
          {errCount > 0 && (
            <span className="tag tag-err">
              <XCircle size={11} aria-hidden />
              {errCount} 错误
            </span>
          )}
          {warnCount > 0 && (
            <span className="tag tag-warn">
              <AlertTriangle size={11} aria-hidden />
              {warnCount} 提醒
            </span>
          )}
        </span>
      </div>

      <div className="preview-tabs" role="tablist" aria-label={`${result.platformName}预览视图`}>
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`${tabBase}-tab-${t.key}`}
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`${tabBase}-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={tab === t.key ? "preview-tab active" : "preview-tab"}
            onClick={() => setTab(t.key)}
            onKeyDown={(e) => onTabKey(e, t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className="preview-body"
        role="tabpanel"
        id={`${tabBase}-panel-${tab}`}
        aria-labelledby={`${tabBase}-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "preview" && <PreviewRender payload={payload} platformId={result.platformId} />}
        {tab === "source" && <pre className="preview-source">{payload.content}</pre>}
        {tab === "issues" && <IssueList issues={issues} instructions={result.artifact?.instructions ?? []} />}
      </div>
    </div>
  );
});

function PreviewRender({
  payload,
  platformId,
}: {
  payload: NonNullable<PlatformResult["artifact"]>["payload"];
  platformId: string;
}) {
  if (payload.mime === "text/plain") {
    // 小红书:模拟手机屏纯文本展示。
    return (
      <div className="phone-frame">
        <div className="xhs-title">{payload.title}</div>
        <div className="xhs-body">{payload.content}</div>
      </div>
    );
  }
  // HTML:公众号用窄手机框,知乎/B站用全宽阅读区(均为浅色,所见即所得)。
  const isWechat = platformId === "wechat";
  // 纵深防御:产物虽已经 core sanitize,渲染前再过 DOMPurify(允许内联 style)。
  const safeHtml = DOMPurify.sanitize(payload.content, { ADD_ATTR: ["style"] });
  return (
    <div className="phone-frame" style={isWechat ? undefined : { maxWidth: "none" }}>
      <div className="html-title">{payload.title}</div>
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
}

function IssueIcon({ severity }: { severity: ValidationIssue["severity"] }) {
  if (severity === "error") return <XCircle size={15} aria-hidden />;
  if (severity === "warning") return <AlertTriangle size={15} aria-hidden />;
  return <Info size={15} aria-hidden />;
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
      {issues.length === 0 && (
        <div className="issue-ok">
          <CheckCircle2 size={16} aria-hidden />
          校验通过，无问题
        </div>
      )}
      {issues.map((i, idx) => (
        <div key={`${i.severity}-${i.message}-${idx}`} className={`issue issue-${i.severity}`}>
          <IssueIcon severity={i.severity} />
          <span>{i.message}</span>
        </div>
      ))}
      {instructions.length > 0 && (
        <div className="instructions">
          <div className="instructions-title">
            <ListChecks size={13} aria-hidden />
            发布说明
          </div>
          {instructions.map((t, idx) => (
            <div key={`${idx}-${t}`} className="instruction-item">
              {t}
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
