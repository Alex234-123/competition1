"""UI 重构实测:亮/暗主题、抽屉、全屏预览,截图复核 + 控制台错误捕获 + a11y 断言。"""
import io
import sys
from playwright.sync_api import sync_playwright

# Windows 控制台默认 GBK,强制 UTF-8 以输出 ✓/✗ 与中文。
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

OUT = "/tmp/mpp_ui"
URL = "http://localhost:5176"
errors = []
fails = []


def check(cond, msg):
    print(f"{'✓' if cond else '✗'} {msg}")
    if not cond:
        fails.append(msg)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))

        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(800)

        # 1) 默认(初始 system,此环境解析为 light)全貌
        page.screenshot(path=f"{OUT}_01_light.png", full_page=False)
        cards = page.locator(".platform-preview").count()
        check(cards == 4, f"platform-preview 卡片数=4(实际 {cards})")

        # --- a11y:tab ARIA 关联 ---
        first_tab = page.locator('[role="tab"]').first
        controls = first_tab.get_attribute("aria-controls")
        panel = page.locator(f'#{controls}') if controls else None
        check(bool(controls), "tab 有 aria-controls")
        check(panel is not None and panel.count() == 1 and panel.get_attribute("role") == "tabpanel",
              "aria-controls 指向 role=tabpanel 面板")
        check(page.locator('[role="tabpanel"][aria-labelledby]').count() >= 4, "每张卡片 tabpanel 都有 aria-labelledby")

        # --- a11y:tablist 箭头键切换(roving tabindex) ---
        first_tab.focus()
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(150)
        active_now = page.evaluate("document.activeElement?.getAttribute('aria-selected')")
        check(active_now == "true", "ArrowRight 后焦点落在新激活 tab 上")
        page.locator(".preview-tab", has_text="预览").first.click()

        # tab 切换到源码 + 截图
        page.locator(".preview-tab", has_text="源码").first.click()
        page.wait_for_timeout(200)
        page.screenshot(path=f"{OUT}_02_source_tab.png")
        page.locator(".preview-tab", has_text="预览").first.click()

        # --- a11y:工具栏按钮语义 ---
        drafts_btn = page.get_by_role("button", name="草稿与历史", exact=False)
        check(drafts_btn.get_attribute("aria-haspopup") == "dialog", "草稿按钮 aria-haspopup=dialog")
        check(drafts_btn.get_attribute("aria-pressed") is None, "草稿按钮无 aria-pressed(非切换态)")
        fs_btn = page.get_by_role("button", name="全屏预览", exact=False)
        check(fs_btn.get_attribute("aria-pressed") == "false", "全屏预览按钮 aria-pressed=false(切换态)")

        # 2) 切到暗色:system -> light -> dark,需点 2 次
        for _ in range(2):
            page.get_by_role("button", name="切换主题", exact=False).click()
            page.wait_for_timeout(250)
        dt = page.evaluate("document.documentElement.getAttribute('data-theme')")
        check(dt == "dark", f"两次点击后 data-theme=dark(实际 {dt})")
        page.screenshot(path=f"{OUT}_03_dark.png")

        # --- 对比度:实测暗色下次要文字 text-3 与背景比值 ---
        contrast = page.evaluate("""() => {
          function lum(rgb){const v=rgb.map(c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];}
          function parse(s){const m=s.match(/\\d+/g).map(Number);return [m[0],m[1],m[2]];}
          const cs=getComputedStyle(document.documentElement);
          const t3=parse(cs.getPropertyValue('--text-3').trim()||'rgb(136,143,154)');
          // --text-3 是 hex,需转;直接取一个真实次要文字元素的渲染色更稳
          const el=document.querySelector('.preview-meta, .field-label, .toolbar-title-sub');
          const fg=parse(getComputedStyle(el).color);
          const surf=parse(getComputedStyle(document.body).backgroundColor);
          const l1=lum(fg),l2=lum(surf);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);
          return Math.round((hi+0.05)/(lo+0.05)*100)/100;
        }""")
        print(f"  暗色次要文字/背景对比度 ≈ {contrast}:1")

        # 3) 暗色下打开 AI 设置抽屉
        page.get_by_role("button", name="AI 设置", exact=False).click()
        page.wait_for_timeout(500)
        check(page.locator(".drawer").count() == 1, "AI 设置抽屉已打开")
        # label 关联:抽屉内 .field 应为 label 元素
        field_label_tags = page.eval_on_selector_all(
            ".drawer .field", "els => els.map(e => e.tagName.toLowerCase())")
        check(all(t == "label" for t in field_label_tags) and len(field_label_tags) == 3,
              f"设置抽屉三个字段均为 <label>(实际 {field_label_tags})")
        page.screenshot(path=f"{OUT}_04_settings_drawer.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)

        # 4) 打开草稿抽屉
        page.get_by_role("button", name="草稿与历史", exact=False).click()
        page.wait_for_timeout(500)
        page.screenshot(path=f"{OUT}_05_drafts_drawer.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

        # 5) 全屏预览切换
        page.get_by_role("button", name="全屏预览", exact=False).click()
        page.wait_for_timeout(500)
        check(page.locator(".workspace.preview-only").count() == 1, "进入全屏预览模式")
        page.screenshot(path=f"{OUT}_06_preview_only.png")

        # 6) 退出全屏(全屏态下按钮 label 为「显示编辑栏」)
        page.get_by_role("button", name="显示编辑栏", exact=False).click()
        page.wait_for_timeout(300)
        check(page.locator(".workspace.preview-only").count() == 0, "退出全屏预览")

        # 7) dark -> system
        page.get_by_role("button", name="切换主题", exact=False).click()
        page.wait_for_timeout(300)
        dt2 = page.evaluate("document.documentElement.getAttribute('data-theme')")
        check(dt2 is None, f"再点一次回到 system(data-theme=None,实际 {dt2})")

        browser.close()


if __name__ == "__main__":
    run()
    print("\n=== Console/Page 错误 ===")
    for e in errors:
        print(e)
    print("无错误" if not errors else "")
    print(f"\n=== 断言:{len(fails)} 失败 ===")
    for f in fails:
        print(f"  ✗ {f}")
    sys.exit(1 if (errors or fails) else 0)
