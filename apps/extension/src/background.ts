// Kontrata extension service worker. Adds "I-check sa Kontrata" to the right-click menu for selected text and
// hands the selection to the side panel through session storage (memory only, cleared when the browser closes).
// Nothing is sent over the network.

const MENU_ID = "kontrata-check";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: "I-check sa Kontrata", contexts: ["selection"] });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;
  // open() must run synchronously inside the user gesture, before any await.
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  chrome.storage.session.set({ pending: { text: info.selectionText ?? "", at: Date.now() } });
});
