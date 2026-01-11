# Changelog

All notable improvements to this project are documented in this file.

## [Enhanced UI & Notifications] - 2026-01-11

### Added
- **Model Presets Dropdown**
  - 30+ curated model presets organized by provider
  - OpenAI GPT-5 series (5.2, 5.2 Pro, 5, 5 Mini, 5 Nano)
  - OpenAI GPT-4 series (4.1, 4o, 4o Mini)
  - OpenAI reasoning models (o3, o3 Pro, o4 Mini, o3 Mini)
  - Google Gemini 3 series (3 Pro, 3 Flash)
  - Google Gemini 2.5 series (2.5 Pro, 2.5 Flash, 2.5 Flash Lite)
  - Google Gemini 2.0 series
  - Anthropic Claude variants
  - X.AI Grok models
  - Local provider models (Ollama, LM Studio)
  - Quick model selection without changing API endpoint

- **New Tab Grouping Notifications**
  - Actionable notifications when new tabs open or URLs change
  - "Group Now" button triggers AI organize flow
  - "Ignore" button dismisses notification
  - 10-second cooldown prevents notification spam
  - Smart filtering (HTTP/HTTPS only, skips when organizing)
  - Uses existing AI organize pipeline for consistency

- **Quick Settings Access**
  - Gear button in popup header opens Options page
  - One-click access to API configuration
  - Clear visual icon for settings

### Improved
- **Popup UI Enhancements**
  - Enlarged logo (10x10, was 8x8) for better visibility
  - Rounded corners on logo (rounded-xl)
  - Settings button in header for quick access
  - Better header layout with justify-between spacing

- **Debug Log Behavior**
  - Extended auto-dismiss delays (success: 8s, error: 6s, was 3s/4s)
  - Auto-dismiss paused when debug logs exist or are shown
  - Logs persist across organize runs until new run starts
  - No longer cleared on auto-dismiss
  - Users get more time to review logs

- **Permissions**
  - Added `notifications` permission for tab grouping prompts
  - Documented in README with clear use case explanation

### Technical
- Exported `startOrganize()` from organize message handler
- Background script wires notification buttons to organize flow
- Tab listeners for `onCreated` and `onUpdated` events
- Hostname extraction for cleaner notification messages
- Cooldown timer prevents excessive notifications

---

## [Improved] - 2026-01-10

### Added
- **Input Validation System**
  - URL format validation for API endpoints
  - Required field validation (API key, model)
  - Real-time field validation with visual feedback
  - Automatic whitespace trimming on save

- **Error Recovery Mechanisms**
  - Automatic retry with exponential backoff (max 2 retries)
  - 60-second request timeout
  - Smart retry logic for transient errors (429, 500, 502, 503, 504)
  - Detailed debug logging for troubleshooting

- **Keyboard Shortcuts**
  - `Enter` or `Space`: Organize tabs / Cancel if running
  - `Escape`: Cancel organization (when running)
  - `C` or `Delete`: Clear all groups

- **Configuration Presets**
  - Quick setup dropdown with 6 provider presets:
    - OpenAI
    - Anthropic (Claude via OpenRouter)
    - X.AI (Grok via OpenRouter)  
    - Google (Gemini via OpenRouter)
    - Ollama (Local)
    - LM Studio (Local)
  - One-click configuration for popular APIs

- **Accessibility Features**
  - ARIA labels on all interactive elements
  - ARIA live regions for status updates
  - Screen reader announcements for state changes
  - Semantic HTML with proper roles
  - Helpful tooltips on all buttons

- **Comprehensive Documentation**
  - JSDoc comments for all major functions
  - Parameter and return value documentation
  - Usage examples in code
  - Error condition documentation

### Improved
- **Type Safety**
  - Added null/undefined checks throughout
  - Implemented type guards for parsed data
  - Better error messages with context
  - Removed unsafe `any` type usage
  - Proper array and object validation

- **Performance**
  - Added `useMemo` for expensive calculations
  - Added `useCallback` for event handlers
  - Reduced unnecessary component re-renders
  - Optimized status display logic

- **Error Messages**
  - User-friendly, actionable error messages
  - Context-specific guidance
  - No exposure of sensitive API details
  - Clear validation feedback

- **Code Organization**
  - Separated validation logic into dedicated functions
  - Cleaner separation of concerns
  - More maintainable codebase
  - Consistent error handling patterns

### Fixed
- Potential crashes from malformed API responses
- Race conditions in tab grouping
- Memory leaks from event listeners
- Accessibility issues with screen readers
- Type safety issues with undefined values

### Security
- API keys no longer exposed in error messages
- Proper URL validation prevents injection attacks
- Input sanitization for all user inputs
- Secure defaults for all settings

---

## [Original] - 2024

### Initial Release
- AI-powered tab organization
- OpenAI-compatible API support
- Tab grouping with colors and names
- Auto-collapse functionality
- Debug mode
- Options page for configuration

---

## Version Notes

This changelog documents improvements made to the original Tab Organizer extension.

For the original project, see: https://github.com/Nothflare/tab_organizer
