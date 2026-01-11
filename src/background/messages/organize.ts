import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getAllTabs, ungroupAllTabs, createTabGroups } from "~/lib/tabs"
import { getSettings, validateSettings } from "~/lib/storage"
import { organizeTabsWithAI } from "~/lib/api"
import type { Settings } from "~/lib/types"
import {
  startTask,
  completeTask,
  failTask,
  setTaskPhase,
  isRunning,
  getTaskState
} from "~/background/taskManager"

export type OrganizeRequest = {
  action: "organize"
}

export type OrganizeResponse = {
  started: boolean
  error?: string
}

// Check if task was cancelled (by reading storage directly)
async function isCancelled(): Promise<boolean> {
  const state = await getTaskState()
  return state.status === "cancelled"
}

async function executeOrganizeTask(
  settings: Settings,
  signal: AbortSignal
): Promise<void> {
  const debugLog: string[] = []
  const onDebug = (msg: string) => {
    if (settings.debugMode) {
      debugLog.push(msg)
    }
  }

  try {
    // Phase 1: Fetch tabs
    await setTaskPhase("fetching-tabs")
    onDebug("Fetching tabs...")
    const tabs = await getAllTabs()
    onDebug(`Found ${tabs.length} tabs`)

    if (signal.aborted || await isCancelled()) return

    if (tabs.length === 0) {
      await failTask("No tabs found")
      return
    }

    if (signal.aborted || await isCancelled()) return

    // Phase 2: Ungroup existing
    await setTaskPhase("ungrouping")
    onDebug("Ungrouping existing groups...")
    await ungroupAllTabs()

    if (signal.aborted || await isCancelled()) return

    // Phase 3: Call AI (the long operation)
    await setTaskPhase("calling-ai")
    onDebug("Calling AI...")
    const groups = await organizeTabsWithAI(tabs, settings, {
      signal,
      onDebug
    })
    onDebug(`AI returned ${groups.length} groups`)

    if (signal.aborted || await isCancelled()) return

    // Phase 4: Create groups
    await setTaskPhase("creating-groups")
    onDebug("Creating groups...")

    // Get active tab now (not earlier) since user may have switched during AI call
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })
    const activeTabId = activeTab?.id
    if (settings.collapseGroups) {
      onDebug(`Collapse others enabled, active tab ${activeTabId ?? "none"} group stays expanded`)
    }
    await createTabGroups(groups, {
      collapseOthers: settings.collapseGroups,
      activeTabId
    })

    // Final check before completing
    if (await isCancelled()) return

    onDebug("Done!")
    await completeTask({
      groupCount: groups.length,
      debug: settings.debugMode ? debugLog : undefined
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Cancellation via AbortController
      return
    }

    // Check if cancelled before reporting error
    if (await isCancelled()) return

    const message = error instanceof Error ? error.message : "Unknown error"
    onDebug(`Error: ${message}`)
    await failTask(message)
  }
}

const handler: PlasmoMessaging.MessageHandler<OrganizeRequest, OrganizeResponse> = async (req, res) => {
  // Prevent duplicate tasks
  if (await isRunning()) {
    res.send({ started: false, error: "Task already running" })
    return
  }

  const settings = await getSettings()

  // Validate before starting
  const validation = validateSettings(settings)
  if (!validation.valid) {
    res.send({
      started: false,
      error: validation.error || "Please configure API settings in the extension options"
    })
    return
  }

  // Start the task and get the abort controller
  const abortController = await startTask()

  // Acknowledge immediately - popup can close now
  res.send({ started: true })

  // Run the actual work asynchronously (fire-and-forget)
  executeOrganizeTask(settings, abortController.signal)
}

export default handler

// Allow programmatic organize from background (e.g., notifications)
export async function startOrganize(): Promise<void> {
  if (await isRunning()) {
    return
  }

  const settings = await getSettings()
  const validation = validateSettings(settings)
  if (!validation.valid) {
    await failTask(validation.error || "Please configure API settings in the extension options")
    return
  }

  // Show "Regrouping..." notification
  const NOTIFICATION_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const regroupNotificationId = `regrouping-${Date.now()}`
  
  try {
    await chrome.notifications.create(regroupNotificationId, {
      type: "basic",
      title: "Tab Organizer",
      message: "Regrouping your tabs...",
      iconUrl: NOTIFICATION_ICON,
      priority: 1
    })
    
    // Auto-dismiss after task completes (we'll clear it when done)
    setTimeout(() => {
      chrome.notifications.clear(regroupNotificationId)
    }, 3000)
  } catch (error) {
    console.error('[Tab Organizer] Failed to show regrouping notification:', error)
  }

  const abortController = await startTask()
  executeOrganizeTask(settings, abortController.signal)
}
