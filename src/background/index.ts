import { startOrganize } from "~/background/messages/organize"
import { isRunning } from "~/background/taskManager"

// Prompt user to group when new tabs open or navigate to a new URL
const PROMPT_COOLDOWN_MS = 10000
let lastPromptAt = 0

function isHttpUrl(url?: string): boolean {
	if (!url) return false
	return url.startsWith("http://") || url.startsWith("https://")
}

function hostnameFrom(url: string): string {
	try {
		return new URL(url).hostname
	} catch {
		return url
	}
}

async function maybePromptForTab(tabId: number, url?: string) {
	if (!isHttpUrl(url)) return
	if (await isRunning()) return

	const now = Date.now()
	if (now - lastPromptAt < PROMPT_COOLDOWN_MS) return
	lastPromptAt = now

	const notificationId = `group-tab-${tabId}-${now}`
	const iconUrl = chrome.runtime.getURL("assets/icon.png")

	chrome.notifications.create(notificationId, {
		type: "basic",
		title: "Group this tab?",
		message: hostnameFrom(url!),
		iconUrl,
		buttons: [
			{ title: "Group Now" },
			{ title: "Ignore" }
		],
		priority: 0
	})
}

chrome.tabs.onCreated.addListener((tab) => {
	if (tab.id !== undefined) {
		maybePromptForTab(tab.id, tab.url)
	}
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url) {
		maybePromptForTab(tabId, changeInfo.url)
	}
})

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
	if (!notificationId.startsWith("group-tab-")) return
	if (buttonIndex === 0) {
		// Group now via existing AI organize flow
		startOrganize()
	}
	chrome.notifications.clear(notificationId)
})

// Plasmo handles message routing automatically via the messages/ directory
