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
  const currentWindow = await chrome.windows.getCurrent()
  const groups = await chrome.tabGroups.query({ windowId: currentWindow.id })

  // Collect all tab IDs from all groups in parallel
  const tabsPerGroup = await Promise.all(
    groups.map(group => chrome.tabs.query({ groupId: group.id }))
  )
  const tabIds = tabsPerGroup
    .flat()
    .map(tab => tab.id)
    .filter((id): id is number => id !== undefined)

  // Ungroup all tabs at once, ignoring errors from closed tabs
  if (tabIds.length > 0) {
    try {
      await chrome.tabs.ungroup(tabIds)
    } catch {
      // Some tabs may have been closed - ungroup remaining one by one
      for (const tabId of tabIds) {
        try {
          await chrome.tabs.ungroup(tabId)
        } catch {
          // Tab no longer exists, skip
        }
      }
    }
  }
}

export interface CreateGroupsOptions {
  collapseOthers?: boolean
  activeTabId?: number
}

async function filterExistingTabs(tabIds: number[]): Promise<number[]> {
  const existing: number[] = []
  for (const tabId of tabIds) {
    try {
      await chrome.tabs.get(tabId)
      existing.push(tabId)
    } catch {
      // Tab no longer exists
    }
  }
  return existing
}

export async function createTabGroups(
  groups: TabGroup[],
  options: CreateGroupsOptions = {}
): Promise<void> {
  const { collapseOthers = false, activeTabId } = options

  for (const group of groups) {
    // Filter out tabs that may have been closed
    const validTabIds = await filterExistingTabs(group.tabIds)
    if (validTabIds.length === 0) continue

    try {
      const groupId = await chrome.tabs.group({ tabIds: validTabIds })

      // Determine if this group should be collapsed
      // If collapseOthers is enabled, collapse all groups except the one containing the active tab
      const containsActiveTab = activeTabId !== undefined && validTabIds.includes(activeTabId)
      const shouldCollapse = collapseOthers && !containsActiveTab

      await chrome.tabGroups.update(groupId, {
        title: group.name,
        color: group.color,
        collapsed: shouldCollapse
      })
    } catch {
      // Group creation failed (tabs may have been closed between check and group)
      // Continue with remaining groups
    }
  }
}

