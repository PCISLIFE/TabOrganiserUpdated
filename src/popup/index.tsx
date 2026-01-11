import { useState, useEffect, useMemo, useCallback } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import type { UngroupResponse } from "~/background/messages/ungroup"
import type { OrganizeResponse } from "~/background/messages/organize"
import type { TaskState, TaskPhase } from "~/lib/types"
import "~/style.css"

const TASK_STATE_KEY = "task_state"

// Map task phases to user-friendly messages
const PHASE_MESSAGES: Record<TaskPhase, string> = {
  "fetching-tabs": "Fetching tabs...",
  "ungrouping": "Preparing...",
  "calling-ai": "AI thinking...",
  "creating-groups": "Creating groups..."
}

function Popup() {
  const [taskState, setTaskState] = useState<TaskState>({ status: "idle" })
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)

  // Load initial state and listen for changes
  useEffect(() => {
    // Load initial state directly from storage
    chrome.storage.local.get(TASK_STATE_KEY).then((result) => {
      const state = result[TASK_STATE_KEY] as TaskState | undefined
      if (state?.status) {
        setTaskState(state)
        if (state.status === "completed" && state.result?.debug) {
          setDebugLog(state.result.debug)
        }
      }
    })

    // Listen for storage changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes[TASK_STATE_KEY]) {
        const newState = changes[TASK_STATE_KEY].newValue as TaskState
        if (newState?.status) {
          setTaskState(newState)
          if (newState.status === "completed" && newState.result?.debug) {
            setDebugLog(newState.result.debug)
          }
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  // Auto-dismiss all terminal states after a delay (unless debug is available)
  useEffect(() => {
    const isTerminalState = taskState.status === "completed" ||
                           taskState.status === "error" ||
                           taskState.status === "cancelled"
    if (!isTerminalState) return

    // If there are debug logs available or shown, don't auto-dismiss
    if (debugLog.length > 0 || showDebug) return

    // Longer delays so users can read
    const delay = taskState.status === "completed" ? 8000 : 6000

    const timeout = setTimeout(async () => {
      await chrome.storage.local.set({ [TASK_STATE_KEY]: { status: "idle" } })
      setTaskState({ status: "idle" })
    }, delay)

    return () => clearTimeout(timeout)
  }, [taskState.status, debugLog.length, showDebug])

  // Handle organize button click (toggle behavior)
  const handleOrganizeClick = useCallback(async () => {
    if (taskState.status === "running") {
      // Cancel the running task - update storage directly for immediate feedback
      const cancelledState: TaskState = { status: "cancelled", cancelledAt: Date.now() }
      await chrome.storage.local.set({ [TASK_STATE_KEY]: cancelledState })
      setTaskState(cancelledState)
      // Also notify background to abort if possible
      sendToBackground({ name: "cancelTask" }).catch(() => {})
    } else {
      // Clear any previous state and start fresh
      setDebugLog([])
      const runningState: TaskState = { status: "running", phase: "fetching-tabs", startedAt: Date.now() }
      setTaskState(runningState)

      try {
        const response = await sendToBackground<{}, OrganizeResponse>({
          name: "organize"
        })

        if (response?.error) {
          const errorState: TaskState = { status: "error", error: response.error, failedAt: Date.now() }
          await chrome.storage.local.set({ [TASK_STATE_KEY]: errorState })
          setTaskState(errorState)
        }
        // If started successfully, storage listener will handle updates
      } catch (error) {
        console.error("Failed to start organize:", error)
        const errorState: TaskState = {
          status: "error",
          error: error instanceof Error ? error.message : "Failed to start",
          failedAt: Date.now()
        }
        await chrome.storage.local.set({ [TASK_STATE_KEY]: errorState })
        setTaskState(errorState)
      }
    }
  }, [taskState.status])

  const handleUngroup = useCallback(async () => {
    if (taskState.status === "running") return

    try {
      const response = await sendToBackground<{}, UngroupResponse>({
        name: "ungroup"
      })

      if (response.success) {
        // Brief success indication
        const successState: TaskState = { status: "completed", result: { groupCount: 0 }, completedAt: Date.now() }
        await chrome.storage.local.set({ [TASK_STATE_KEY]: successState })
        setTaskState(successState)
      } else {
        const errorState: TaskState = {
          status: "error",
          error: response.error || "Failed to ungroup",
          failedAt: Date.now()
        }
        await chrome.storage.local.set({ [TASK_STATE_KEY]: errorState })
        setTaskState(errorState)
      }
    } catch (error) {
      const errorState: TaskState = {
        status: "error",
        error: error instanceof Error ? error.message : "Error",
        failedAt: Date.now()
      }
      await chrome.storage.local.set({ [TASK_STATE_KEY]: errorState })
      setTaskState(errorState)
    }
  }, [taskState.status])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Enter or Space to organize/cancel
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        handleOrganizeClick()
      }
      // Escape to cancel if running
      else if (e.key === "Escape" && taskState.status === "running") {
        e.preventDefault()
        handleOrganizeClick()
      }
      // 'c' or 'Delete' to clear groups
      else if ((e.key === "c" || e.key === "Delete") && taskState.status !== "running") {
        e.preventDefault()
        handleUngroup()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [handleOrganizeClick, handleUngroup, taskState.status])

  // Derive UI state
  const isRunning = taskState.status === "running"

  // Get status display (memoized to prevent recalculation)
  const statusDisplay = useMemo((): { text: string; color: string } => {
    switch (taskState.status) {
      case "idle":
        return { text: "Ready to organize", color: "text-zinc-500" }
      case "running":
        return { text: PHASE_MESSAGES[taskState.phase], color: "text-blue-400" }
      case "completed":
        return {
          text: taskState.result.groupCount > 0
            ? `Done — ${taskState.result.groupCount} groups created`
            : "Done — Ungrouped",
          color: "text-emerald-400"
        }
      case "cancelled":
        return { text: "Cancelled", color: "text-yellow-400" }
      case "error":
        return { text: taskState.error, color: "text-red-400" }
    }
  }, [taskState])

  // Animation state for text transitions
  const [displayText, setDisplayText] = useState("Ready to organize")
  const [textColor, setTextColor] = useState("text-zinc-500")
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (statusDisplay.text === displayText) return

    // Start exit animation
    setIsExiting(true)

    // After exit animation, swap text and enter
    const timeout = setTimeout(() => {
      setDisplayText(statusDisplay.text)
      setTextColor(statusDisplay.color)
      setShouldAnimate(taskState.status === "running")
      setIsExiting(false)
    }, 150)

    return () => clearTimeout(timeout)
  }, [statusDisplay.text])

  const WaveText = ({ text }: { text: string }) => (
    <span className="inline-flex">
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="animate-wave"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  )

  return (
    <div className="w-[320px] bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] text-zinc-50 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">Tab Organizer</h1>
            <p className="text-[11px] text-zinc-500">AI-powered grouping</p>
          </div>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Open settings"
          aria-label="Open settings"
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 hover:border-zinc-600/50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.983 4.077a1 1 0 011.034 0l1.2.694a1 1 0 00.886.044l1.26-.504a1 1 0 011.18.424l.744 1.17a1 1 0 00.78.456l1.357.11a1 1 0 01.91.91l.11 1.357a1 1 0 00.456.78l1.17.744a1 1 0 01.424 1.18l-.504 1.26a1 1 0 00.044.886l.694 1.2a1 1 0 010 1.034l-.694 1.2a1 1 0 00-.044.886l.504 1.26a1 1 0 01-.424 1.18l-1.17.744a1 1 0 00-.456.78l-.11 1.357a1 1 0 01-.91.91l-1.357.11a1 1 0 00-.78.456l-.744 1.17a1 1 0 01-1.18.424l-1.26-.504a1 1 0 00-.886.044l-1.2.694a1 1 0 01-1.034 0l-1.2-.694a1 1 0 00-.886-.044l-1.26.504a1 1 0 01-1.18-.424l-.744-1.17a1 1 0 00-.78-.456l-1.357-.11a1 1 0 01-.91-.91l-.11-1.357a1 1 0 00-.456-.78l-1.17-.744a1 1 0 01-.424-1.18l.504-1.26a1 1 0 00-.044-.886l-.694-1.2a1 1 0 010-1.034l.694-1.2a1 1 0 00.044-.886l-.504-1.26a1 1 0 01.424-1.18l1.17-.744a1 1 0 00.456-.78l.11-1.357a1 1 0 01.91-.91l1.357-.11a1 1 0 00.78-.456l.744-1.17a1 1 0 011.18-.424l1.26.504a1 1 0 00.886-.044l1.2-.694zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
          </svg>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleUngroup}
          disabled={isRunning}
          aria-label="Clear all tab groups"
          aria-disabled={isRunning}
          title="Clear all groups (C or Delete)"
          className="h-11 px-4 text-xs font-medium text-zinc-400 bg-zinc-800/60 rounded-lg
                     border border-zinc-700/50 hover:bg-zinc-700/60 hover:text-zinc-200 
                     hover:border-zinc-600/50 disabled:opacity-50 disabled:cursor-not-allowed 
                     transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]
                     active:scale-[0.98] flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
        <button
          onClick={handleOrganizeClick}
          aria-label={isRunning ? "Cancel organization" : "Organize tabs"}
          title={isRunning ? "Cancel (Esc)" : "Organize tabs (Enter)"}
          className={`flex-1 h-11 text-sm font-semibold rounded-lg transition-all duration-200
                      flex items-center justify-center gap-2 shadow-md hover:shadow-lg
                      hover:scale-[1.02] active:scale-[0.98]
                      ${isRunning
                        ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
                        : "bg-gradient-to-r from-zinc-100 to-zinc-50 text-zinc-900 hover:from-white hover:to-zinc-100"
                      }`}
        >
          {isRunning ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Cancel</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Organize</span>
            </>
          )}
        </button>
      </div>

      {/* Status Display */}
      <div 
        className={`px-3 py-2.5 rounded-lg border backdrop-blur-sm overflow-hidden transition-all duration-200 ${
          taskState.status === "error" 
            ? "border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/10" 
            : taskState.status === "completed"
            ? "border-emerald-500/40 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
            : "border-zinc-700/50 bg-zinc-800/40 shadow-sm"
        }`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-start gap-2">
          {/* Status Icon */}
          <div className="mt-0.5">
            {taskState.status === "completed" && (
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {taskState.status === "error" && (
              <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {taskState.status === "idle" && (
              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {taskState.status === "running" && (
              <svg className="w-3.5 h-3.5 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </div>
          
          {/* Status Text */}
          <div className="flex-1">
            <div
              className={`text-xs font-medium ${textColor} transition-all duration-150 ${
                isExiting ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
              }`}
            >
              {shouldAnimate ? <WaveText text={displayText} /> : displayText}
            </div>
          </div>
        </div>

        {debugLog.length > 0 && (
          <button
            onClick={() => setShowDebug(!showDebug)}
            aria-expanded={showDebug}
            aria-controls="debug-log"
            className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors font-medium"
          >
            {showDebug ? "↑ hide debug" : "↓ show debug"}
          </button>
        )}
        {showDebug && debugLog.length > 0 && (
          <pre 
            id="debug-log"
            className="mt-2 p-2 text-[10px] text-zinc-400 bg-black/40 rounded border border-zinc-700/30 overflow-auto max-h-24 font-mono leading-relaxed"
          >
            {debugLog.join("\n")}
          </pre>
        )}
      </div>
    </div>
  )
}

export default Popup
