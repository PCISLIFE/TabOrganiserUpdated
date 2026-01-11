import { startOrganize } from "~/background/messages/organize"
import { isRunning } from "~/background/taskManager"
import { getSettings } from "~/lib/storage"

console.log('[Tab Organizer] Background script loaded')

// Check notification permission on startup
chrome.notifications.getPermissionLevel((level) => {
	console.log('[Tab Organizer] Notification permission level:', level)
})

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
	console.log('[Tab Organizer] maybePromptForTab called:', { tabId, url })
	
	if (!isHttpUrl(url)) {
		console.log('[Tab Organizer] Skipping - not HTTP/HTTPS URL')
		return
	}
	
	if (await isRunning()) {
		console.log('[Tab Organizer] Skipping - organize task already running')
		return
	}

	// Check if user has configured settings (has API key)
	const settings = await getSettings()
	if (!settings.apiKey || settings.apiKey.trim().length === 0) {
		console.log('[Tab Organizer] Skipping notification - no API key configured')
		console.log('[Tab Organizer] Configure your API key in Options to enable tab grouping prompts')
		return
	}

	const now = Date.now()
	const timeSinceLastPrompt = now - lastPromptAt
	if (timeSinceLastPrompt < PROMPT_COOLDOWN_MS) {
		console.log(`[Tab Organizer] Cooldown active - ${Math.round((PROMPT_COOLDOWN_MS - timeSinceLastPrompt) / 1000)}s remaining`)
		return
	}
	lastPromptAt = now

	const notificationId = `group-tab-${tabId}-${now}`
	const hostname = hostnameFrom(url!)

	console.log(`[Tab Organizer] Creating notification for: ${hostname}`)

	try {
		// Use a simple data URL icon since asset bundling is failing
		const iconDataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSJ1cmwoI2EpIi8+PHBhdGggZD0iTTYgOGEyIDIgMCAwMTItMmgyYTIgMiAwIDAxMiAydjJhMiAyIDAgMDEtMiAySDhhMiAyIDAgMDEtMi0yVjh6TTE0IDhhMiAyIDAgMDEyLTJoMmEyIDIgMCAwMTIgMnYyYTIgMiAwIDAxLTIgMmgtMmEyIDIgMCAwMS0yLTJWOHpNNiAxNmEyIDIgMCAwMTItMmgyYTIgMiAwIDAxMiAydjJhMiAyIDAgMDEtMiAySDhhMiAyIDAgMDEtMi0ydi0yek0xNCAxNmEyIDIgMCAwMTItMmgyYTIgMiAwIDAxMiAydjJhMiAyIDAgMDEtMiAyaC0yYTIgMiAwIDAxLTItMnYtMnoiIGZpbGw9IiNmZmYiLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwIiB5MT0iMCIgeDI9IjI0IiB5Mj0iMjQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBzdG9wLWNvbG9yPSIjM0I4MkY2Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjOEI35RkMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48L3N2Zz4='
		
		await chrome.notifications.create(notificationId, {
			type: "basic",
			title: "Group this tab?",
			message: hostname,
			iconUrl: iconDataUrl,
			buttons: [
				{ title: "Group Now" },
				{ title: "Ignore" }
			],
			priority: 0
		})
		console.log('[Tab Organizer] Notification created successfully:', notificationId)
	} catch (error) {
		console.error('[Tab Organizer] Failed to create notification:', error)
	}
}

chrome.tabs.onCreated.addListener((tab) => {
	console.log('[Tab Organizer] Tab created event:', tab.id, tab.url)
	if (tab.id !== undefined) {
		maybePromptForTab(tab.id, tab.url)
	}
})
console.log('[Tab Organizer] Registered onCreated listener')

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url) {
		console.log('[Tab Organizer] Tab updated event:', tabId, changeInfo.url)
		maybePromptForTab(tabId, changeInfo.url)
	}
})
console.log('[Tab Organizer] Registered onUpdated listener')

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
	console.log('[Tab Organizer] Notification button clicked:', notificationId, buttonIndex)
	if (!notificationId.startsWith("group-tab-")) return
	if (buttonIndex === 0) {
		console.log('[Tab Organizer] User clicked "Group Now" - starting organize')
		// Group now via existing AI organize flow
		startOrganize()
	}
	chrome.notifications.clear(notificationId)
})
console.log('[Tab Organizer] Registered onButtonClicked listener')

// Plasmo handles message routing automatically via the messages/ directory
