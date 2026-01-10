import type { Settings } from "./types"

const STORAGE_KEY = "tab_organizer_settings"

const defaultSettings: Settings = {
  apiEndpoint: "https://openrouter.ai/api/v1",
  apiKey: "",
  model: "x-ai/grok-4.1-fast",
  debugMode: false,
  collapseGroups: true,
  reasoningEffort: "off"
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Validates settings object for completeness and correctness.
 * 
 * Checks for:
 * - Valid HTTP/HTTPS API endpoint URL
 * - Non-empty API key
 * - Non-empty model name
 * 
 * @param settings - Settings object to validate
 * @returns Validation result with valid flag and optional error message
 * 
 * @example
 * ```typescript
 * const validation = validateSettings(settings)
 * if (!validation.valid) {
 *   console.error(validation.error)
 * }
 * ```
 */
export function validateSettings(settings: Settings): { valid: boolean; error?: string } {
  if (!settings.apiEndpoint || !isValidUrl(settings.apiEndpoint)) {
    return { valid: false, error: "Invalid API endpoint URL" }
  }
  
  if (!settings.apiKey || settings.apiKey.trim().length === 0) {
    return { valid: false, error: "API key is required" }
  }
  
  if (!settings.model || settings.model.trim().length === 0) {
    return { valid: false, error: "Model name is required" }
  }
  
  return { valid: true }
}

/**
 * Retrieves user settings from Chrome sync storage.
 * 
 * Merges stored settings with defaults to ensure all properties are present.
 * 
 * @returns Promise resolving to complete settings object
 * 
 * @example
 * ```typescript
 * const settings = await getSettings()
 * console.log(`Using model: ${settings.model}`)
 * ```
 */
export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY)
  return { ...defaultSettings, ...result[STORAGE_KEY] }
}

/**
 * Saves user settings to Chrome sync storage.
 * 
 * Merges with existing settings and trims whitespace from string values.
 * Settings sync across devices when user is signed into Chrome.
 * 
 * @param settings - Partial settings object to save (merged with existing)
 * @returns Promise that resolves when settings are saved
 * 
 * @example
 * ```typescript
 * await saveSettings({ model: 'gpt-4o', debugMode: true })
 * ```
 */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  const updated = { ...current, ...settings }
  
  // Trim whitespace from string values
  if (updated.apiEndpoint) {
    updated.apiEndpoint = updated.apiEndpoint.trim()
  }
  if (updated.apiKey) {
    updated.apiKey = updated.apiKey.trim()
  }
  if (updated.model) {
    updated.model = updated.model.trim()
  }
  
  await chrome.storage.sync.set({
    [STORAGE_KEY]: updated
  })
}
