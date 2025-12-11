# Technologies & Acknowledgments

This document lists all the APIs, tools, and technologies used in building Lexia.

---

## APIs Used

### ElevenLabs API

**Purpose:** High-quality text-to-speech with word-level timestamps

- **Endpoint:** `/v1/text-to-speech/{voice_id}/with-timestamps`
- **Features Used:**
  - Text-to-speech synthesis with multiple voice options
  - Word-level timestamp data for synchronized highlighting
  - Voice catalog retrieval for dynamic voice selection
- **Documentation:** [ElevenLabs API Docs](https://elevenlabs.io/docs/api-reference)
- **License:** Commercial API (users provide their own API keys)

### Anthropic Claude API

**Purpose:** AI-powered text editing and explanations

- **Model:** `claude-sonnet-4-20250514`
- **Endpoint:** `/v1/messages`
- **Features Used:**
  - Text editing based on voice commands (e.g., "make this more formal")
  - Text explanation generation for the "Explain" feature
- **Documentation:** [Anthropic API Docs](https://docs.anthropic.com/)
- **License:** Commercial API (users provide their own API keys)

### Web Speech API

**Purpose:** Browser-native speech recognition for dictation

- **Interface:** `SpeechRecognition` / `webkitSpeechRecognition`
- **Features Used:**
  - Continuous speech recognition
  - Interim results for real-time transcription display
  - Language configuration (en-US)
- **Documentation:** [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- **License:** Built into modern browsers (Chrome, Edge)

---

## Browser APIs

### Chrome Extension APIs (Manifest V3)

- **`chrome.storage.local`** - Persist user settings and API keys
- **`chrome.runtime`** - Message passing between components
- **`chrome.contextMenus`** - Right-click "Read with Lexia" menu item
- **`chrome.scripting`** - Inject content scripts
- **`chrome.commands`** - Keyboard shortcuts (Alt+V, Alt+Space)

**Documentation:** [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference/)

### Web APIs

- **`window.getSelection()`** - Capture user's text selection
- **`Range` API** - Manipulate DOM for word highlighting
- **`Audio` API** - Playback of synthesized speech
- **`Clipboard` API** - Fallback for dictation when no input is focused

---

## Design Patterns & Inspiration

### WhisperFlow-Style Dictation

Our hold-to-dictate interaction pattern is inspired by the "WhisperFlow" paradigm - a voice input method where users hold a button to speak and release to insert text. This provides:
- Clear start/stop boundaries for speech recognition
- Immediate visual feedback during dictation
- Easy cancellation (ESC key)

### Speechify-Style Player

The floating sidebar player design is inspired by [Speechify](https://speechify.com/), featuring:
- Compact, non-intrusive sidebar
- Word-by-word highlighting synchronized with audio
- Speed controls and skip functionality

---

## Development Tools

| Tool | Purpose |
|------|---------|
| **Visual Studio Code** | Primary IDE |
| **Chrome DevTools** | Extension debugging |
| **Git/GitHub** | Version control |

---

## Icon Assets

- SVG icons are based on [Font Awesome](https://fontawesome.com/) style paths
- Icons are embedded inline as SVG for performance and simplicity
- **License:** Icons created to match Font Awesome aesthetic (not directly copied)

---

## No Additional Dependencies

Lexia is built with **vanilla JavaScript** and has **no npm dependencies**. This means:
- No build step required
- Minimal extension size
- Easy to audit and understand
- Works directly in the browser

---

## Privacy & Data Handling

- **No backend server** - All API calls go directly from the browser to ElevenLabs/Anthropic
- **No data collection** - We don't track, store, or process any user data
- **User-owned API keys** - Users maintain full control over their API usage and costs

---

## License

This project is open source. See the repository for license details.

---

## Acknowledgments

- **ElevenLabs** for providing high-quality, natural-sounding TTS with timestamp support
- **Anthropic** for Claude's excellent instruction-following capabilities
- **The Chrome Extensions team** for Manifest V3 and comprehensive APIs
- **MDN Web Docs** for excellent Web Speech API documentation

---

*Built for the ElevenLabs Hackathon by Team AISquad#1*
