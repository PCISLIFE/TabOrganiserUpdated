import type { TabInfo, TabGroup } from "./types"

export async function getAllTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({ currentWindow: true })
  return tabs
    .filter((tab) => tab.id !== undefined && tab.url)
    .map((tab) => ({
      id: tab.id!,
      title: tab.title || "Untitled",
      url: tab.url || ""
    }))
}

export async function ungroupAllTabs(): Promise<void> {
  const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT })
  for (const group of groups) {
    const tabs = await chrome.tabs.query({ groupId: group.id })
    for (const tab of tabs) {
      if (tab.id) {
        await chrome.tabs.ungroup(tab.id)
      }
    }
  }
}

export async function createTabGroups(groups: TabGroup[]): Promise<void> {
  for (const group of groups) {
    if (group.tabIds.length === 0) continue

    const groupId = await chrome.tabs.group({ tabIds: group.tabIds })
    await chrome.tabGroups.update(groupId, {
      title: group.name,
      color: group.color,
      collapsed: false
    })
  }
}
