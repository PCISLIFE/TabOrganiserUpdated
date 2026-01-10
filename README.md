# Tab Organizer

A simple Chrome extension that automatically organizes your browser tabs into logical groups. [Get on Chrome Web Store](https://chromewebstore.google.com/detail/hfmbpiclobiljhgecpghmgjpdfecoacp)

## Demo

https://github.com/user-attachments/assets/fe4dd323-b359-41a7-a9b8-2bd724a5f9cd

<p align="center">
  <img src="docs/media/promo-organize.png" alt="One-click tab organization" width="640">
</p>

<p align="center">
  <img src="docs/media/promo-settings.png" alt="Bring your own API key" width="640">
</p>

## Features

- **AI-Powered Grouping**: Uses OpenAI-compatible APIs to intelligently categorize tabs by content
- **One-Click Organization**: Instantly organize all tabs in the current window
- **Auto-Collapse**: Optionally collapse all groups except the one containing your active tab
- **Custom API Support**: Works with OpenAI, or any OpenAI-compatible endpoint (Ollama, LM Studio, etc.)
- **Debug Mode**: Built-in logging to troubleshoot API issues

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/Nothflare/tab_organizer.git
   cd tab_organizer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the extension:
   ```bash
   pnpm build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-prod` folder

## Configuration

1. Click the extension icon and select the gear icon, or right-click the extension and choose "Options"
2. Configure your API settings:
   - **API Endpoint**: Your OpenAI-compatible API URL (default: `https://api.openai.com/v1`)
   - **API Key**: Your API key
   - **Model**: The model to use (default: `gpt-4o`)
3. Optional settings:
   - **Auto-collapse groups**: Collapse all groups except the active one after organizing
   - **Debug mode**: Show detailed logs in the popup

## Usage

1. Click the extension icon to open the popup
2. Click **Organize** to group all tabs in the current window
3. Click **Clear** to remove all tab groups

## Development

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build
```

## Tech Stack

- [Plasmo](https://plasmo.com/) - Browser extension framework
- [React 19](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Privacy

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details on data handling.

**TL;DR**: No data collection. Tab info is only sent to your configured API endpoint.

## License

MIT
---

## Recent Improvements

This fork includes comprehensive improvements to the original Tab Organizer:

### Code Quality
- ✅ Enhanced input validation and error handling
- ✅ Improved type safety with better null checking
- ✅ Performance optimizations using React hooks
- ✅ Comprehensive JSDoc documentation

### User Experience
- ✅ **Keyboard shortcuts**: Enter to organize, Esc to cancel, C to clear
- ✅ **Accessibility**: Full screen reader support with ARIA labels
- ✅ **Quick setup presets**: One-click configuration for OpenAI, Anthropic, X.AI, Google, Ollama, and LM Studio
- ✅ **Field validation**: Real-time feedback for configuration errors

### Reliability
- ✅ **Automatic retry**: Smart retry logic with exponential backoff for API failures
- ✅ **Request timeout**: 60-second timeout prevents hanging requests
- ✅ **Better error messages**: Clear, actionable feedback when things go wrong

See [IMPROVEMENTS.md](IMPROVEMENTS.md) for detailed documentation of all changes.