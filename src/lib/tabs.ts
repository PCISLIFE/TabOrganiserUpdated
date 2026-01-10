import type { TabInfo, TabGroup } from "./types"

/**
 * Retrieves all tabs from the current browser window.
 * 
 * Filters out tabs without IDs or URLs to ensure data completeness.
 * 
 * @returns Promise resolving to array of tab information
 * 
 * @example
 * ```typescript
 * const tabs = await getAllTabs()
 * console.log(`Found ${tabs.length} tabs`)
 * ```
 */
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

/**
 * Removes all tab groups from the current window.
 * 
 * Ungroups all tabs in parallel when possible, falls back to sequential
 * ungrouping if some tabs have been closed during the operation.
 * 
 * @returns Promise that resolves when all tabs are ungrouped
 * 
 * @example
 * ```typescript
 * await ungroupAllTabs()
 * console.log('All groups removed')
 * ```
 */
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

/**
 * Creates browser tab groups from the provided group definitions.
 * 
 * Validates that tabs still exist before grouping and handles closed tabs gracefully.
 * Optionally collapses all groups except the one containing the active tab.
 * 
 * @param groups - Array of group definitions with names, colors, and tab IDs
 * @param options - Optional configuration:
 *   - collapseOthers: If true, collapse all groups except active tab's group
 *   - activeTabId: ID of the currently active tab
 * 
 * @returns Promise that resolves when all groups are created
 * 
 * @example
 * ```typescript
 * await createTabGroups([
 *   { name: '🛠️ Work', color: 'blue', tabIds: [1, 2, 3] },
 *   { name: '📚 Reading', color: 'green', tabIds: [4, 5] }
 * ], { collapseOthers: true, activeTabId: 2 })
 * ```
 */
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

