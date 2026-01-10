# Changelog

All notable improvements to this project are documented in this file.

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
