import { useEffect, useState } from "react"
import { getSettings, saveSettings, validateSettings, isValidUrl } from "~/lib/storage"
import type { Settings } from "~/lib/types"
import { Button } from "~/components/ui/button"
import { Switch } from "~/components/ui/switch"
import "~/style.css"

// API Provider Presets
const API_PRESETS = {
  openai: {
    name: "OpenAI",
    apiEndpoint: "https://api.openai.com/v1",
    model: "gpt-4o"
  },
  anthropic: {
    name: "Anthropic (via OpenRouter)",
    apiEndpoint: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-sonnet-4.5"
  },
  xai: {
    name: "X.AI (via OpenRouter)",
    apiEndpoint: "https://openrouter.ai/api/v1",
    model: "x-ai/grok-4.1-fast"
  },
  google: {
    name: "Google (via OpenRouter)",
    apiEndpoint: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-pro-exp-02:free"
  },
  ollama: {
    name: "Ollama (Local)",
    apiEndpoint: "http://localhost:11434/v1",
    model: "llama3.2"
  },
  lmstudio: {
    name: "LM Studio (Local)",
    apiEndpoint: "http://localhost:1234/v1",
    model: "local-model"
  }
} as const

type PresetKey = keyof typeof API_PRESETS

function Options() {
  const [settings, setSettings] = useState<Settings>({
    apiEndpoint: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o",
    debugMode: false,
    collapseGroups: false,
    reasoningEffort: "off"
  })
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{
    apiEndpoint?: string
    apiKey?: string
    model?: string
  }>({})

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  const handleSave = async () => {
    // Clear previous errors
    setError(null)
    setValidationErrors({})
    
    // Validate settings
    const validation = validateSettings(settings)
    if (!validation.valid) {
      setError(validation.error || "Invalid settings")
      return
    }
    
    try {
      await saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    }
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    // Clear error when user starts typing
    setError(null)
    setValidationErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validateField = (field: keyof Settings) => {
    const newErrors = { ...validationErrors }
    
    if (field === "apiEndpoint") {
      if (!settings.apiEndpoint || !isValidUrl(settings.apiEndpoint)) {
        newErrors.apiEndpoint = "Invalid URL format"
      } else {
        delete newErrors.apiEndpoint
      }
    } else if (field === "apiKey") {
      if (!settings.apiKey || settings.apiKey.trim().length === 0) {
        newErrors.apiKey = "API key is required"
      } else {
        delete newErrors.apiKey
      }
    } else if (field === "model") {
      if (!settings.model || settings.model.trim().length === 0) {
        newErrors.model = "Model name is required"
      } else {
        delete newErrors.model
      }
    }
    
    setValidationErrors(newErrors)
  }

  const applyPreset = (presetKey: PresetKey) => {
    const preset = API_PRESETS[presetKey]
    setSettings((prev) => ({
      ...prev,
      apiEndpoint: preset.apiEndpoint,
      model: preset.model
    }))
    setError(null)
    setValidationErrors({})
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-xl font-medium">Tab Organizer Settings</h1>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Quick Setup
            </label>
            <select
              onChange={(e) => e.target.value && applyPreset(e.target.value as PresetKey)}
              defaultValue=""
              className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm focus:outline-none focus:border-zinc-700"
            >
              <option value="" disabled>Select a provider preset...</option>
              {Object.entries(API_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>{preset.name}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              Quickly configure for popular API providers
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              API Endpoint
            </label>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={(e) => updateSetting("apiEndpoint", e.target.value)}
              onBlur={() => validateField("apiEndpoint")}
              placeholder="https://api.openai.com/v1"
              className={`w-full h-10 px-3 bg-zinc-900 border rounded-md text-sm focus:outline-none focus:border-zinc-700 ${
                validationErrors.apiEndpoint ? "border-red-500/50" : "border-zinc-800"
              }`}
            />
            {validationErrors.apiEndpoint && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.apiEndpoint}</p>
            )}
            <p className="text-xs text-zinc-500 mt-1">
              Compatible with OpenAI, Ollama, OpenRouter, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => updateSetting("apiKey", e.target.value)}
                onBlur={() => validateField("apiKey")}
                placeholder="sk-..."
                className={`flex-1 h-10 px-3 bg-zinc-900 border rounded-md text-sm focus:outline-none focus:border-zinc-700 ${
                  validationErrors.apiKey ? "border-red-500/50" : "border-zinc-800"
                }`}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 h-10 text-xs text-zinc-400 hover:text-zinc-300 border border-zinc-800 rounded-md"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            {validationErrors.apiKey && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.apiKey}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Model</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => updateSetting("model", e.target.value)}
              onBlur={() => validateField("model")}
              placeholder="gpt-4o"
              className={`w-full h-10 px-3 bg-zinc-900 border rounded-md text-sm focus:outline-none focus:border-zinc-700 ${
                validationErrors.model ? "border-red-500/50" : "border-zinc-800"
              }`}
            />
            {validationErrors.model && (
              <p className="text-xs text-red-400 mt-1">{validationErrors.model}</p>
            )}
            <p className="text-xs text-zinc-500 mt-1">
              e.g. openai/gpt-5-mini, x-ai/grok-4.1-fast, anthropic/claude-sonnet-4.5, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Reasoning Effort</label>
            <select
              value={settings.reasoningEffort}
              onChange={(e) => updateSetting("reasoningEffort", e.target.value as Settings["reasoningEffort"])}
              className="w-full h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-md text-sm focus:outline-none focus:border-zinc-700"
            >
              <option value="off">Off</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              For thinking models (o1, o3, etc.). Ignored by other models.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Switch
              id="collapseGroups"
              checked={settings.collapseGroups}
              onCheckedChange={(checked) => updateSetting("collapseGroups", checked)}
            />
            <div className="flex flex-col gap-0.5">
              <label htmlFor="collapseGroups" className="text-sm cursor-pointer">
                Collapse other groups after organizing
              </label>
              <p className="text-xs text-zinc-500">
                Keep only the active tab's group expanded for a cleaner view
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="debug"
              checked={settings.debugMode}
              onCheckedChange={(checked) => updateSetting("debugMode", checked)}
            />
            <label htmlFor="debug" className="text-sm cursor-pointer">
              Enable debug logging
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave}>Save</Button>
          {saved && <span className="text-sm text-green-400">Saved</span>}
        </div>
      </div>
    </div>
  )
}

export default Options
