/**
 * MV3 service worker —— 点击扩展图标时打开独立整页工具。
 *
 * 注意:SW 无 DOM,不做任何剪贴板/Canvas;只负责打开 tab 与消息路由。
 */

// 点击工具栏图标 → 打开 dedicated tab(主界面)。
chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});
