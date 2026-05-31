import * as Dialog from "@radix-ui/react-dialog";
import { X, FilePlus2, Trash2, History, Check, AlertTriangle, FileText } from "lucide-react";
import type { Draft, HistoryEntry } from "../storage/draft-store.js";
import { formatTime } from "./format.js";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: Draft[];
  currentDraftId: string | null;
  history: HistoryEntry[];
  onNew: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

/** 草稿与发布历史抽屉。 */
export function DraftsDrawer({
  open,
  onOpenChange,
  drafts,
  currentDraftId,
  history,
  onNew,
  onLoad,
  onDelete,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="drawer" aria-describedby={undefined}>
          <div className="drawer-header">
            <Dialog.Title className="drawer-title">
              <FileText size={18} aria-hidden style={{ verticalAlign: "-3px", marginRight: 6 }} />
              草稿与历史
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="btn-icon" aria-label="关闭">
                <X size={18} aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="drawer-body">
            <button type="button" className="btn btn-primary" onClick={onNew}>
              <FilePlus2 size={16} aria-hidden />
              新建草稿
            </button>

            <section>
              <div className="card-trigger-meta" style={{ marginBottom: "var(--sp-2)" }}>
                草稿（{drafts.length}）
              </div>
              {drafts.length === 0 ? (
                <div className="list-empty">编辑内容会自动存为草稿，刷新不丢失。</div>
              ) : (
                <ul className="draft-list">
                  {drafts.map((d) => (
                    <li key={d.id} className={d.id === currentDraftId ? "draft-item active" : "draft-item"}>
                      <button className="draft-open" onClick={() => onLoad(d.id)} title={d.title}>
                        <span className="draft-title">{d.title || "未命名草稿"}</span>
                        <span className="draft-time">{formatTime(d.updatedAt)}</span>
                      </button>
                      <button className="draft-del" onClick={() => onDelete(d.id)} aria-label={`删除草稿 ${d.title}`}>
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {history.length > 0 && (
              <section>
                <div className="card-trigger-meta" style={{ marginBottom: "var(--sp-2)" }}>
                  <History size={13} aria-hidden />
                  发布历史（{history.length}）
                </div>
                <ul className="history-list">
                  {history.map((h) => (
                    <li key={h.id} className="history-item">
                      <div className="history-head">
                        <span className="history-title">{h.draftTitle}</span>
                        <span className="history-time">{formatTime(h.at)}</span>
                      </div>
                      <div className="history-platforms">
                        {h.platforms.map((p) => (
                          <span key={p.platformId} className={p.ok ? "tag tag-ok" : "tag tag-err"} title={p.message}>
                            {p.ok ? <Check size={11} aria-hidden /> : <AlertTriangle size={11} aria-hidden />}
                            {p.platformId}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
