// VoiceFlow Popup Script
// Handles API key status and settings navigation

class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    await this.checkApiKeys();
    this.setupEventListeners();
  }

  async checkApiKeys() {
    const keys = await this.getStoredKeys();
    
    // Update ElevenLabs status
    const elevenLabsStatus = document.getElementById('elevenLabsStatus');
    if (keys.elevenLabsKey) {
      elevenLabsStatus.textContent = '✓ Connected';
      elevenLabsStatus.className = 'status connected';
    } else {
      elevenLabsStatus.textContent = '✗ Not Set';
      elevenLabsStatus.className = 'status missing';
    }

    // Update Claude status
    const claudeStatus = document.getElementById('claudeStatus');
    if (keys.claudeKey) {
      claudeStatus.textContent = '✓ Connected';
      claudeStatus.className = 'status connected';
    } else {
      claudeStatus.textContent = '✗ Not Set';
      claudeStatus.className = 'status missing';
    }

    // Update main status
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const setupBtn = document.getElementById('setupBtn');

    if (keys.elevenLabsKey) {
      statusIcon.textContent = '✅';
      statusText.textContent = 'Ready! Select text on any page to read aloud.';
      statusText.className = 'status-text success';
      setupBtn.textContent = '⚙️ Settings';
      setupBtn.className = 'setup-btn secondary';
    } else {
      statusIcon.textContent = '⚠️';
      statusText.textContent = 'Please configure your API keys to get started.';
      statusText.className = 'status-text warning';
      setupBtn.textContent = '🔑 Configure API Keys';
      setupBtn.className = 'setup-btn';
    }
  }

  async getStoredKeys() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['elevenLabsKey', 'claudeKey'], (result) => {
        resolve({
          elevenLabsKey: result.elevenLabsKey || '',
          claudeKey: result.claudeKey || ''
        });
      });
    });
  }

  setupEventListeners() {
    // Settings button in header
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // Main setup button
    document.getElementById('setupBtn').addEventListener('click', () => {
      this.openSettings();
    });
  }

  openSettings() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
