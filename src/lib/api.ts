import type { Settings, TabInfo, AIResponse, TabGroup } from "./types"

const SYSTEM_PROMPT = `You are a browser tab organizer. Create precise, task-focused groups.

Guidelines:
- Create SPECIFIC groups (e.g. "🛠️ React Debugging" not "💻 Development")
- Prefer more smaller groups over fewer large ones
- Split by distinct tasks/topics, even within same domain
- Max 6-8 tabs per group - split larger sets by subtask
- ALWAYS prefix names with relevant emoji
- Every tab must be in exactly one group

Return ONLY valid JSON:
{"groups":[{"name":"💻 Work","color":"blue","tabIds":[0,1,2]}]}

Colors: grey, blue, red, yellow, green, pink, purple, cyan, orange`

// Request timeout in milliseconds (60 seconds)
const REQUEST_TIMEOUT_MS = 60000

// Retry configuration
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000 // Initial delay, doubles on each retry

/**
 * Delays execution for a specified number of milliseconds
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Determines if an error is retryable (network errors, rate limits, server errors)
 */
function isRetryableError(status?: number): boolean {
  if (!status) return true // Network errors
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

/**
 * Sanitizes a URL to include only origin and first path segment
 * This reduces token usage when sending URLs to the AI
 */
function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "(invalid URL)"
  
  try {
    const parsed = new URL(url)
    const pathSegments = parsed.pathname.split("/").filter(Boolean)
    const firstPath = pathSegments.length > 0 ? `/${pathSegments[0]}` : ""
    return `${parsed.origin}${firstPath}`
  } catch {
    // Return a simplified version for invalid URLs
    return url.substring(0, 50)
  }
}

interface TabMapping {
  indexToId: Map<number, number>
  idToIndex: Map<number, number>
}

function createTabMapping(tabs: TabInfo[]): TabMapping {
  const indexToId = new Map<number, number>()
  const idToIndex = new Map<number, number>()
  
  tabs.forEach((tab, index) => {
    if (tab && typeof tab.id === "number") {
      indexToId.set(index, tab.id)
      idToIndex.set(tab.id, index)
    }
  })
  
  return { indexToId, idToIndex }
}

function buildUserPrompt(tabs: TabInfo[]): string {
  if (!Array.isArray(tabs) || tabs.length === 0) {
    throw new Error("No tabs provided")
  }
  
  // Use short indices (0, 1, 2...) instead of actual tab IDs to minimize LLM output
  const tabList = tabs
    .map((t, index) => {
      const title = t?.title || "Untitled"
      const url = t?.url ? sanitizeUrl(t.url) : "(no URL)"
      return `${index}: "${title}" | ${url}`
    })
    .join("\n")
  return `Organize these tabs:\n\n${tabList}`
}

const VALID_COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"] as const

function parseResponse(text: string, mapping: TabMapping): TabGroup[] {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid response: empty or non-string content")
  }
  
  // Extract JSON from response (handles markdown code blocks)
  let jsonStr = text
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  let parsed: AIResponse
  try {
    parsed = JSON.parse(jsonStr)
  } catch (error) {
    throw new Error(`AI returned invalid JSON: ${error instanceof Error ? error.message : 'parse error'}`)
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid response: not an object")
  }

  if (!parsed.groups || !Array.isArray(parsed.groups)) {
    throw new Error("Invalid response: missing or invalid groups array")
  }

  if (parsed.groups.length === 0) {
    throw new Error("AI returned zero groups - try again or check your prompt")
  }

  return parsed.groups.map((group, idx) => {
    if (!group || typeof group !== "object") {
      throw new Error(`Invalid group at index ${idx}`)
    }
    
    return {
      name: group.name || "Unnamed",
      color: VALID_COLORS.includes(group.color as any) ? group.color : "grey",
      // Map indices back to actual tab IDs, skip any unknown indices
      tabIds: (group.tabIds || [])
        .filter((id): id is number => typeof id === "number")
        .map((index) => mapping.indexToId.get(index))
        .filter((id): id is number => id !== undefined)
    }
  })
}

/**
 * Creates a fetch request with timeout support
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    fetch(url, options)
      .then((response) => {
        clearTimeout(timeoutId)
        resolve(response)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Organizes browser tabs using an AI model via OpenAI-compatible API.
 * 
 * This function sends tab information to an AI API and receives grouping suggestions.
 * It includes retry logic with exponential backoff for handling transient failures.
 * 
 * @param tabs - Array of tab information to organize
 * @param settings - User configuration including API endpoint, key, and model
 * @param options - Optional configuration:
 *   - signal: AbortSignal for cancellation support
 *   - onDebug: Callback for debug logging
 * 
 * @returns Promise resolving to array of suggested tab groups
 * 
 * @throws Error if:
 *   - No tabs provided
 *   - API authentication fails (401, 403)
 *   - API returns invalid or empty response
 *   - Request is cancelled
 *   - All retry attempts are exhausted
 * 
 * @example
 * ```typescript
 * const tabs = await getAllTabs()
 * const settings = await getSettings()
 * const groups = await organizeTabsWithAI(tabs, settings, {
 *   onDebug: (msg) => console.log(msg)
 * })
 * ```
 */
export async function organizeTabsWithAI(
  tabs: TabInfo[],
  settings: Settings,
  options?: { signal?: AbortSignal; onDebug?: (msg: string) => void }
): Promise<TabGroup[]> {
  const { signal, onDebug } = options ?? {}
  const { apiEndpoint, apiKey, model, reasoningEffort } = settings
  const mapping = createTabMapping(tabs)

  if (tabs.length === 0) {
    throw new Error("No tabs to organize")
  }

  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(tabs) }
    ],
    temperature: 0.3
  }

  // Add reasoning_effort for thinking models (ignored by non-thinking models)
  if (reasoningEffort && reasoningEffort !== "off") {
    requestBody.reasoning_effort = reasoningEffort
  }

  onDebug?.(`Request to ${apiEndpoint}/chat/completions`)
  onDebug?.(`Model: ${model}`)
  onDebug?.(`Tabs: ${tabs.length}`)
  if (reasoningEffort && reasoningEffort !== "off") {
    onDebug?.(`Reasoning: ${reasoningEffort}`)
  }

  // Retry logic with exponential backoff
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) {
      throw new Error("Request cancelled")
    }

    if (attempt > 0) {
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      onDebug?.(`Retry attempt ${attempt}/${MAX_RETRIES} after ${delayMs}ms...`)
      await delay(delayMs)
    }

    try {
      const response = await fetchWithTimeout(
        `${apiEndpoint}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal
        },
        REQUEST_TIMEOUT_MS
      )

      if (!response.ok) {
        const errorText = await response.text()
        onDebug?.(`Error: ${response.status} - ${errorText}`)
        
        // Check if error is retryable
        if (attempt < MAX_RETRIES && isRetryableError(response.status)) {
          lastError = new Error(`API error: ${response.status}`)
          continue // Retry
        }
        
        // Don't expose full error details to UI - may contain sensitive info
        const statusMessages: Record<number, string> = {
          401: "Invalid API key",
          403: "Access denied - check API key permissions",
          429: "Rate limited - please wait and try again",
          500: "API server error - try again later",
          503: "API service unavailable - try again later"
        }
        throw new Error(statusMessages[response.status] || `API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error("No content in API response")
      }

      onDebug?.(`Response: ${content}`)

      return parseResponse(content, mapping)
    } catch (error) {
      // Handle timeout and network errors
      if (error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("cancelled")) {
          throw error // Don't retry cancelled requests
        }
        
        if (attempt < MAX_RETRIES && (error.message.includes("timeout") || error.message.includes("fetch"))) {
          onDebug?.(`Network error: ${error.message}`)
          lastError = error
          continue // Retry
        }
      }
      throw error
    }
  }

  // All retries exhausted
  throw lastError || new Error("Request failed after multiple retries")
}
