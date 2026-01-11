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
// Model-only presets (does not change API endpoint)
const MODEL_PRESETS = {
  "OpenAI • GPT-4o": "gpt-4o",
  "OpenAI • o3-mini-high": "o3-mini-high",
  "Anthropic • Claude 3.7 Sonnet": "anthropic/claude-3-7-sonnet",
  "X.AI • Grok-2": "x-ai/grok-2",
  "Google • Gemini 2.0 (free)": "google/gemini-2.0-pro-exp-02:free",
  "Ollama • Llama 3.2": "llama3.2",
  "LM Studio • Local": "local-model"
} as const

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

  const applyModelPreset = (model: string) => {
    setSettings((prev) => ({ ...prev, model }))
    setError(null)
    setValidationErrors((prev) => ({ ...prev, model: undefined }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#0a0a0a] to-[#050505] text-zinc-50 flex items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
            <p className="text-sm text-zinc-500">Configure your AI tab organizer</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/40 rounded-lg text-sm text-red-400 shadow-lg shadow-red-500/10 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Main Settings Card */}
        <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/60 rounded-xl p-6 shadow-xl space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Setup
            </label>
            <select
              onChange={(e) => e.target.value && applyPreset(e.target.value as PresetKey)}
              defaultValue=""
              className="w-full h-11 px-3 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm 
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all duration-200 shadow-sm hover:bg-zinc-800"
            >
              <option value="" disabled>Select a provider preset...</option>
              {Object.entries(API_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>{preset.name}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Quickly configure for popular API providers
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Model Preset
            </label>
            <select
              onChange={(e) => e.target.value && applyModelPreset(e.target.value)}
              defaultValue=""
              className="w-full h-11 px-3 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm 
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all duration-200 shadow-sm hover:bg-zinc-800"
            >
              <option value="" disabled>Select a model preset...</option>
              {Object.entries(MODEL_PRESETS).map(([label, model]) => (
                <option key={label} value={model}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1.5">Pick a common model without changing the provider.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-200">
              API Endpoint
            </label>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={(e) => updateSetting("apiEndpoint", e.target.value)}
              onBlur={() => validateField("apiEndpoint")}
              placeholder="https://api.openai.com/v1"
              className={`w-full h-11 px-3 bg-zinc-800/60 border rounded-lg text-sm 
                         focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm
                         hover:bg-zinc-800 ${
                validationErrors.apiEndpoint 
                  ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" 
                  : "border-zinc-700/50 focus:border-blue-500/50 focus:ring-blue-500/20"
              }`}
            />
            {validationErrors.apiEndpoint && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {validationErrors.apiEndpoint}
              </p>
            )}
            <p className="text-xs text-zinc-500 mt-1.5">
              Compatible with OpenAI, Ollama, OpenRouter, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-200">API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => updateSetting("apiKey", e.target.value)}
                onBlur={() => validateField("apiKey")}
                placeholder="sk-..."
                className={`flex-1 h-11 px-3 bg-zinc-800/60 border rounded-lg text-sm 
                           focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm
                           hover:bg-zinc-800 ${
                  validationErrors.apiKey 
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" 
                    : "border-zinc-700/50 focus:border-blue-500/50 focus:ring-blue-500/20"
                }`}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-4 h-11 text-xs font-medium text-zinc-400 hover:text-zinc-200 
                           bg-zinc-800/60 border border-zinc-700/50 rounded-lg 
                           hover:bg-zinc-800 hover:border-zinc-600/50 transition-all duration-200 shadow-sm"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            {validationErrors.apiKey && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {validationErrors.apiKey}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-200">Model</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => updateSetting("model", e.target.value)}
              onBlur={() => validateField("model")}
              placeholder="gpt-4o"
              className={`w-full h-11 px-3 bg-zinc-800/60 border rounded-lg text-sm 
                         focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm
                         hover:bg-zinc-800 ${
                validationErrors.model 
                  ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" 
                  : "border-zinc-700/50 focus:border-blue-500/50 focus:ring-blue-500/20"
              }`}
            />
            {validationErrors.model && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {validationErrors.model}
              </p>
            )}
            <p className="text-xs text-zinc-500 mt-1.5">
              e.g. openai/gpt-5-mini, x-ai/grok-4.1-fast, anthropic/claude-sonnet-4.5, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-200">Reasoning Effort</label>
            <select
              value={settings.reasoningEffort}
              onChange={(e) => updateSetting("reasoningEffort", e.target.value as Settings["reasoningEffort"])}
              className="w-full h-11 px-3 bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-sm 
                         focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
                         transition-all duration-200 shadow-sm hover:bg-zinc-800"
            >
              <option value="off">Off</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <p className="text-xs text-zinc-500 mt-1.5">
              For thinking models (o1, o3, etc.). Ignored by other models.
            </p>
          </div>

          <div className="pt-2 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors">
              <Switch
                id="collapseGroups"
                checked={settings.collapseGroups}
                onCheckedChange={(checked) => updateSetting("collapseGroups", checked)}
              />
              <div className="flex flex-col gap-0.5">
                <label htmlFor="collapseGroups" className="text-sm font-medium cursor-pointer text-zinc-200">
                  Collapse other groups after organizing
                </label>
                <p className="text-xs text-zinc-500">
                  Keep only the active tab's group expanded for a cleaner view
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors">
              <Switch
                id="debug"
                checked={settings.debugMode}
                onCheckedChange={(checked) => updateSetting("debugMode", checked)}
              />
              <label htmlFor="debug" className="text-sm font-medium cursor-pointer text-zinc-200">
                Enable debug logging
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 
                       text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200
                       hover:scale-[1.02] active:scale-[0.98] font-semibold"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Settings
          </Button>
          {saved && (
            <span className="text-sm text-emerald-400 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved successfully
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default Options
