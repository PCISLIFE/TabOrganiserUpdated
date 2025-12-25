# Privacy Policy for Tab Organizer

*Last updated: December 25, 2025*

## What data does this extension access?

- **Tab titles and URLs** of your open browser tabs (required to categorize them)

## What happens to that data?

- URLs are **sanitized** before leaving your browser—query parameters, tokens, and tracking info are stripped
- Sanitized URLs and tab titles are sent **only** to the API endpoint you configure in settings
- Your API key and endpoint URL are stored **locally** in Chrome's storage and never transmitted except to your configured endpoint

## What data do we collect?

**None.** This extension has no server, no analytics, no account system, and no telemetry. We don't see or store any of your data.

## Third parties

The only external request this extension makes is to the API endpoint **you** configure (e.g., OpenAI, Google Gemini, a local Ollama instance, etc.). What happens to your data there is governed by that provider's privacy policy.

## Permissions explained

| Permission | Why it's needed |
|------------|-----------------|
| `tabs` | Read tab titles and URLs to send to AI for categorization |
| `tabGroups` | Create and manage tab groups |
| `storage` | Save your settings (API key, endpoint, preferences) locally |
| `<all_urls>` | Required to read URLs from any tab you have open |

## Open source

This extension is fully open source. You can review exactly what it does:
https://github.com/Nothflare/tab_organizer

## Contact

For questions or concerns, please open an issue on GitHub:
https://github.com/Nothflare/tab_organizer/issues
