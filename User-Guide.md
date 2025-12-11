# Lexia User Guide

A complete guide to setting up and using the Lexia browser extension.

---

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
  - [Getting API Keys](#getting-api-keys)
  - [Setting Up the Extension](#setting-up-the-extension)
- [Using Lexia](#using-lexia)
  - [The Sidebar](#the-sidebar)
  - [Reading Text Aloud](#reading-text-aloud)
  - [Explaining Text](#explaining-text)
  - [Dictation (Voice Typing)](#dictation-voice-typing)
  - [AI-Powered Text Editing](#ai-powered-text-editing)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Troubleshooting](#troubleshooting)

---

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the `extension` folder from this repository
6. The Lexia icon will appear in your browser toolbar

---

## Configuration

### Getting API Keys

Lexia requires two API keys to function:

#### ElevenLabs API Key (Required for TTS)

1. Go to [ElevenLabs](https://elevenlabs.io/) and create an account
2. Navigate to your [Profile Settings](https://elevenlabs.io/app/settings/api-keys)
3. Click **Create API Key**
4. Copy the key (it starts with `sk_`)

> 💡 ElevenLabs offers a free tier with 10,000 characters/month

#### Anthropic Claude API Key (Required for AI Features)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account and add billing information
3. Navigate to [API Keys](https://console.anthropic.com/settings/keys)
4. Click **Create Key**
5. Copy the key (it starts with `sk-ant-`)

> 💡 Claude uses pay-as-you-go pricing. The AI editing and explain features use minimal tokens.

### Setting Up the Extension

1. Click the Lexia icon in your browser toolbar
2. Click **Open Settings**
3. Enter your **ElevenLabs API Key**
4. Click **Test Connection** to verify it works
5. Enter your **Claude API Key**
6. Click **Test Connection** to verify it works
7. Choose your preferred **Default Voice** from the dropdown
8. Adjust other settings as desired
9. Click **Save Settings**

---

## Using Lexia

### The Sidebar

The Lexia sidebar appears on the left side of any webpage. It contains:

| Button | Icon | Function |
|--------|------|----------|
| Play/Pause | ▶️/⏸️ | Start or pause text-to-speech |
| Skip Back | « | Jump back 10 seconds |
| Skip Forward | » | Jump forward 10 seconds |
| Microphone | 🎤 | Hold to dictate (WhisperFlow) |
| Speed | 1x | Cycle through playback speeds |
| Read Selection | ⊞ | Read the currently selected text |
| Explain | ❓ | Get AI explanation of selected text |
| Settings | ⚙️ | Open extension settings |
| Collapse | ‹ | Hide the sidebar |

### Reading Text Aloud

**Method 1: Using the Read Selection button**
1. Select any text on a webpage
2. Click the **Read Selection** button (grid icon) on the sidebar
3. The text will be read aloud with word-by-word highlighting

**Method 2: Using the context menu**
1. Select any text on a webpage
2. Right-click and select **Read with Lexia**
3. The text will be read aloud

**During playback:**
- Click **Play/Pause** to pause/resume
- Click **«** or **»** to skip backward/forward
- Click the **Speed** button to cycle through: 0.5x → 0.75x → 1x → 1.25x → 1.5x → 2x
- Press **Space** to pause/resume (when not in a text field)

### Explaining Text

Get an AI-powered explanation of any text, read aloud:

1. Select the text you want explained
2. Click the **Explain** button (❓) on the sidebar
3. Claude will analyze the text and generate a clear explanation
4. The explanation is automatically read aloud using ElevenLabs

> 💡 Great for understanding jargon, technical terms, or complex sentences

### Dictation (Voice Typing)

Use WhisperFlow-style hold-to-dictate to type with your voice:

1. Click in any text field (input, textarea, or content-editable)
2. **Hold** the microphone button on the sidebar (or press and hold **V**)
3. Speak your text
4. **Release** to insert the text at your cursor position
5. Press **ESC** while holding to cancel without inserting

The dictation display shows:
- Your spoken text in real-time (interim results in gray)
- "Release to insert • ESC to cancel" hint

> 💡 If no text field is focused, dictated text is copied to your clipboard

### AI-Powered Text Editing

Edit any text using voice commands powered by Claude:

1. **Select the text** you want to edit on the page
2. **Hold** the microphone button
3. **Speak your editing instructions**, for example:
   - "Make this more formal"
   - "Fix the grammar"
   - "Change conference to session and add an exclamation mark at the end"
   - "Translate to Spanish"
   - "Make it shorter"
4. **Release** the button
5. Claude processes your instructions and replaces the selected text with the result
6. Short results are automatically read aloud

**Example:**
- Selected: "The first NeurIPS Conference was sponsored by the IEEE."
- You say: "Instead of conference, write session, and add an exclamation mark at the end"
- Result: "The first NeurIPS session was sponsored by the IEEE!"

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Alt+V** | Toggle sidebar visibility |
| **Alt+Space** | Play/Pause |
| **V** (hold) | Start dictation (when not in text field) |
| **Space** | Pause/Resume playback (when not in text field) |
| **←** | Skip back 5 seconds (during playback) |
| **→** | Skip forward 5 seconds (during playback) |
| **ESC** | Cancel dictation |

---

## Settings

Access settings by clicking the **⚙️ Settings** button on the sidebar:

| Setting | Description |
|---------|-------------|
| **ElevenLabs API Key** | Your ElevenLabs API key for text-to-speech |
| **Claude API Key** | Your Anthropic API key for AI features |
| **Default Voice** | The voice used for text-to-speech (many options available) |
| **Default Speed** | Starting playback speed (0.5x to 2x) |
| **Auto-show Sidebar** | Automatically show sidebar on page load |
| **Highlight Words** | Enable word-by-word highlighting during playback |

---

## Troubleshooting

### "Please configure your ElevenLabs API key"
- Open Settings and enter a valid ElevenLabs API key
- Click "Test Connection" to verify it works

### "Please configure your Claude API key"
- Open Settings and enter a valid Claude API key
- This is required for the Explain and AI Edit features

### Dictation not working
- Make sure you're using Chrome (other browsers may not support Web Speech API)
- Allow microphone permissions when prompted
- Try clicking on a text field first to focus it

### Word highlighting not showing
- Make sure "Highlight Words" is enabled in Settings
- The feature works best when you select text before clicking Play
- Some websites with complex layouts may not support highlighting

### Audio not playing
- Check that your system volume is not muted
- Verify your ElevenLabs API key is valid
- Check the browser console for error messages

### Extension not appearing
- Make sure Developer mode is enabled in `chrome://extensions/`
- Try reloading the extension
- Check for errors in the extension's service worker

---

## Privacy

Lexia is privacy-first:
- Your text goes directly from your browser to ElevenLabs and Claude using **your** API keys
- We don't store, track, or have access to any of your data
- All processing happens client-side or via direct API calls you control

---

## Support

For issues or feature requests, please open an issue on the [GitHub repository](https://github.com/CyberEgo/ElevenLabsHackaton).
