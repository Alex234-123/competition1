"""M8 验证:编辑→自动存草稿→刷新仍在→发布后历史出现。

在同一 browser context 内 reload(IndexedDB 跨刷新保留),验证持久化真实生效。
"""
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

URL = "http://localhost:5176"
MARKER = "M8持久化验证标题"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()
        page.goto(URL)
        page.wait_for_load_state("networkidle")

        # 1) 编辑正文(替换为带 marker 的标题)。
        ta = page.locator(".input-pane textarea")
        ta.fill(f"# {MARKER}\n\n这是一段用于验证草稿持久化的正文内容。")
        # 等防抖自动保存(1.2s)+ 余量。
        page.wait_for_timeout(1800)

        # 2) 草稿面板应出现该草稿。
        page.wait_for_selector(".drafts-panel", timeout=5000)
        draft_titles_before = page.locator(".draft-title").all_inner_texts()
        has_before = any(MARKER in t for t in draft_titles_before)
        print(f"[保存后] 草稿列表: {draft_titles_before} -> 含marker={has_before}")

        # 3) 刷新页面(同 context,IndexedDB 保留)。
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector(".drafts-panel", timeout=5000)
        # loadDrafts 是异步的,给点时间渲染。
        page.wait_for_timeout(800)
        draft_titles_after = page.locator(".draft-title").all_inner_texts()
        has_after = any(MARKER in t for t in draft_titles_after)
        print(f"[刷新后] 草稿列表: {draft_titles_after} -> 含marker={has_after}")

        # 4) 加载该草稿,确认编辑区恢复内容。
        if has_after:
            page.locator(".draft-open", has_text=MARKER).first.click()
            page.wait_for_timeout(400)
            restored = page.locator(".input-pane textarea").input_value()
            print(f"[加载草稿] 编辑区含marker={MARKER in restored}")

        # 5) 点击发布,等待完成,历史面板应出现条目。
        page.locator(".publish-btn").click()
        page.wait_for_selector(".history-panel", timeout=10000)
        page.wait_for_timeout(800)
        hist_titles = page.locator(".history-title").all_inner_texts()
        badges = page.locator(".history-badge").all_inner_texts()
        print(f"[发布后] 历史条目: {hist_titles}")
        print(f"[发布后] 平台徽章: {badges}")

        # 6) 刷新后历史仍在(持久化)。
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        hist_after_reload = page.locator(".history-title").all_inner_texts()
        print(f"[再刷新] 历史条目: {hist_after_reload}")

        page.screenshot(path="scripts/m8_verify.png", full_page=True)

        ok = has_before and has_after and len(hist_titles) > 0 and len(hist_after_reload) > 0
        print(f"\nM8 RESULT: {'PASS' if ok else 'FAIL'}")
        browser.close()


if __name__ == "__main__":
    main()
