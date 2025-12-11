// VoiceFlow Settings Page Script
// Handles API key management and preferences

class SettingsManager {
  constructor() {
    this.voices = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.loadElevenLabsVoices();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'elevenLabsKey',
        'claudeKey',
        'defaultVoice',
        'defaultSpeed',
        'autoShowSidebar',
        'highlightWords'
      ], (result) => {
        // API Keys
        if (result.elevenLabsKey) {
          document.getElementById('elevenLabsKey').value = result.elevenLabsKey;
          this.updateStatus('elevenLabsStatus', 'success', '✓ API key saved');
        }
        if (result.claudeKey) {
          document.getElementById('claudeKey').value = result.claudeKey;
          this.updateStatus('claudeStatus', 'success', '✓ API key saved');
        }

        // Preferences
        if (result.defaultVoice) {
          document.getElementById('defaultVoice').value = result.defaultVoice;
        }
        if (result.defaultSpeed) {
          document.getElementById('defaultSpeed').value = result.defaultSpeed;
        }
        document.getElementById('autoShowSidebar').checked = result.autoShowSidebar !== false;
        document.getElementById('highlightWords').checked = result.highlightWords !== false;

        resolve();
      });
    });
  }

  setupEventListeners() {
    // Toggle password visibility
    document.querySelectorAll('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      });
    });

    // Test ElevenLabs connection
    document.getElementById('testElevenLabs').addEventListener('click', async () => {
      await this.testElevenLabsKey();
    });

    // Test Claude connection
    document.getElementById('testClaude').addEventListener('click', async () => {
      await this.testClaudeKey();
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', async () => {
      await this.saveSettings();
    });

    // Clear settings
    document.getElementById('clearSettings').addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all settings? This will remove your API keys.')) {
        await this.clearSettings();
      }
    });

    // Test voice
    document.getElementById('testVoice').addEventListener('click', async () => {
      await this.testVoice();
    });
  }

  async loadElevenLabsVoices() {
    const key = document.getElementById('elevenLabsKey').value.trim();
    if (!key) {
      console.log('No ElevenLabs API key, using default voices');
      return;
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': key
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.voices = data.voices || [];
        this.populateVoiceDropdown();
        console.log('Loaded', this.voices.length, 'voices from ElevenLabs');
      }
    } catch (error) {
      console.error('Failed to load ElevenLabs voices:', error);
    }
  }

  async testVoice() {
    const key = document.getElementById('elevenLabsKey').value.trim();
    const voiceId = document.getElementById('defaultVoice').value;
    
    if (!key) {
      this.showToast('Please add your ElevenLabs API key first', true);
      return;
    }
    
    if (!voiceId) {
      this.showToast('Please select a voice first', true);
      return;
    }

    const testBtn = document.getElementById('testVoice');
    const originalText = testBtn.textContent;
    testBtn.textContent = '⏳ Playing...';
    testBtn.disabled = true;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': key
          },
          body: JSON.stringify({
            text: 'Hello! This is a test of the selected voice. How does it sound?',
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || `API Error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      audio.onended = () => {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        URL.revokeObjectURL(audio.src);
      };
      
      audio.onerror = () => {
        testBtn.textContent = originalText;
        testBtn.disabled = false;
        this.showToast('Failed to play audio', true);
      };

      await audio.play();
      this.showToast('Playing voice sample...');

    } catch (error) {
      console.error('Voice test error:', error);
      this.showToast(`Error: ${error.message}`, true);
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    }
  }

  populateVoiceDropdown() {
    const select = document.getElementById('defaultVoice');
    const currentValue = select.value;
    
    // Clear existing options
    select.innerHTML = '';
    
    if (this.voices.length === 0) {
      // Fallback to default option if no voices loaded
      select.innerHTML = '<option value="21m00Tcm4TlvDq8ikWAM">Rachel (Default)</option>';
      return;
    }
    
    // Add voices from ElevenLabs
    this.voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voice_id;
      option.textContent = voice.name;
      if (voice.labels) {
        const labels = Object.values(voice.labels).filter(l => l).slice(0, 2).join(', ');
        if (labels) {
          option.textContent += ` (${labels})`;
        }
      }
      select.appendChild(option);
    });
    
    // Restore selection if possible
    if (currentValue && this.voices.some(v => v.voice_id === currentValue)) {
      select.value = currentValue;
    }
  }

  async testElevenLabsKey() {
    const key = document.getElementById('elevenLabsKey').value.trim();
    if (!key) {
      this.updateStatus('elevenLabsStatus', 'error', '✗ Please enter an API key');
      return;
    }

    this.updateStatus('elevenLabsStatus', 'pending', '⏳ Testing connection...');

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: {
          'xi-api-key': key
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.updateStatus('elevenLabsStatus', 'success', `✓ Connected as ${data.subscription?.tier || 'user'}`);
        this.showToast('ElevenLabs connection successful!');
        // Load voices after successful connection
        await this.loadElevenLabsVoices();
      } else {
        this.updateStatus('elevenLabsStatus', 'error', '✗ Invalid API key');
        this.showToast('Invalid ElevenLabs API key', true);
      }
    } catch (error) {
      this.updateStatus('elevenLabsStatus', 'error', '✗ Connection failed');
      this.showToast('Connection error: ' + error.message, true);
    }
  }

  async testClaudeKey() {
    const key = document.getElementById('claudeKey').value.trim();
    if (!key) {
      this.updateStatus('claudeStatus', 'error', '✗ Please enter an API key');
      return;
    }

    this.updateStatus('claudeStatus', 'pending', '⏳ Testing connection...');

    try {
      // Simple test message to Claude
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      if (response.ok) {
        this.updateStatus('claudeStatus', 'success', '✓ Connected to Claude API');
        this.showToast('Claude API connection successful!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.updateStatus('claudeStatus', 'error', `✗ ${errorData.error?.message || 'Invalid API key'}`);
        this.showToast('Invalid Claude API key', true);
      }
    } catch (error) {
      this.updateStatus('claudeStatus', 'error', '✗ Connection failed');
      this.showToast('Connection error: ' + error.message, true);
    }
  }

  async saveSettings() {
    const settings = {
      elevenLabsKey: document.getElementById('elevenLabsKey').value.trim(),
      claudeKey: document.getElementById('claudeKey').value.trim(),
      defaultVoice: document.getElementById('defaultVoice').value,
      defaultSpeed: document.getElementById('defaultSpeed').value,
      autoShowSidebar: document.getElementById('autoShowSidebar').checked,
      highlightWords: document.getElementById('highlightWords').checked
    };

    return new Promise((resolve) => {
      chrome.storage.local.set(settings, () => {
        this.showToast('Settings saved successfully!');
        
        // Update status indicators
        if (settings.elevenLabsKey) {
          this.updateStatus('elevenLabsStatus', 'success', '✓ API key saved');
        }
        if (settings.claudeKey) {
          this.updateStatus('claudeStatus', 'success', '✓ API key saved');
        }

        // Notify content scripts about settings change
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'settingsUpdated', 
              settings 
            }).catch(() => {}); // Ignore errors for tabs without content script
          });
        });

        resolve();
      });
    });
  }

  async clearSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        document.getElementById('elevenLabsKey').value = '';
        document.getElementById('claudeKey').value = '';
        document.getElementById('defaultVoice').value = '21m00Tcm4TlvDq8ikWAM';
        document.getElementById('defaultSpeed').value = '1';
        document.getElementById('autoShowSidebar').checked = true;
        document.getElementById('highlightWords').checked = true;

        this.updateStatus('elevenLabsStatus', 'pending', '⏳ Not verified');
        this.updateStatus('claudeStatus', 'pending', '⏳ Not verified');

        this.showToast('All settings cleared');
        resolve();
      });
    });
  }

  updateStatus(elementId, status, message) {
    const element = document.getElementById(elementId);
    element.className = `status-indicator ${status}`;
    element.innerHTML = `<span>${message.split(' ')[0]}</span> ${message.substring(message.indexOf(' ') + 1)}`;
  }

  showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${isError ? 'error' : ''}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});
