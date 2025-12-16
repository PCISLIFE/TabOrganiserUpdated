import type { Settings } from "./types"

const STORAGE_KEY = "tab_organizer_settings"

const defaultSettings: Settings = {
  apiEndpoint: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o",
  debugMode: false
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY)
  return { ...defaultSettings, ...result[STORAGE_KEY] }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.sync.set({
    [STORAGE_KEY]: { ...current, ...settings }
  })
}
