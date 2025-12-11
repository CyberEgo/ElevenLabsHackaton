// VoiceFlow Sidebar - Speechify-style floating player
// Direct ElevenLabs API calls with word-by-word highlighting

class VoiceFlowSidebar {
  constructor() {
    // State
    this.isPlaying = false;
    this.isPaused = false;
    this.isLoading = false;
    this.currentSpeed = 1.0;
    this.currentText = '';
    this.currentWordIndex = 0;
    this.words = [];
    this.wordTimings = [];
    this.audio = null;
    this.highlightInterval = null;
    this.selectedText = '';
    this.isExpanded = false;
    this.toastTimeout = null;
    
    // Voice settings
    this.currentVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel
    this.currentVoiceName = 'Rachel';
    this.availableVoices = [];
    
    // Settings
    this.settings = {
      autoShowSidebar: true,
      highlightWords: true
    };
    
    // API Keys (loaded from storage)
    this.elevenLabsKey = '';
    this.claudeKey = '';
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadApiKeys();
    this.createSidebar();
    this.setupEventListeners();
    this.loadVoices();
    console.log('🎙️ VoiceFlow Sidebar initialized');
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'defaultVoice',
        'defaultSpeed',
        'autoShowSidebar',
        'highlightWords'
      ], (result) => {
        if (result.defaultVoice) this.currentVoiceId = result.defaultVoice;
        if (result.defaultSpeed) this.currentSpeed = parseFloat(result.defaultSpeed);
        if (result.autoShowSidebar !== undefined) this.settings.autoShowSidebar = result.autoShowSidebar;
        if (result.highlightWords !== undefined) this.settings.highlightWords = result.highlightWords;
        resolve();
      });
    });
  }

  async loadApiKeys() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['elevenLabsKey', 'claudeKey'], (result) => {
        this.elevenLabsKey = result.elevenLabsKey || '';
        this.claudeKey = result.claudeKey || '';
        resolve();
      });
    });
  }

  createSidebar() {
    // Remove existing sidebar if any
    const existing = document.getElementById('voiceflow-sidebar');
    if (existing) existing.remove();

    // Create sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'voiceflow-sidebar';
    sidebar.className = this.elevenLabsKey ? '' : 'hidden';
    
    sidebar.innerHTML = `
      <div class="vf-sidebar-inner" id="vf-player">
        <!-- Timer/Progress -->
        <div class="vf-timer" id="vf-timer">0:00</div>

        <!-- Play/Pause Button (FontAwesome-style) -->
        <button class="vf-btn vf-play-btn" id="vf-play" title="Play/Pause (Space)">
          <svg class="vf-icon-play" viewBox="0 0 384 512" fill="currentColor">
            <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>
          </svg>
          <svg class="vf-icon-pause" viewBox="0 0 320 512" fill="currentColor" style="display:none">
            <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/>
          </svg>
        </button>

        <!-- Skip Controls (FontAwesome-style) -->
        <button class="vf-btn vf-skip" id="vf-skip-back" title="Back 10s">
          <svg viewBox="0 0 512 512" fill="currentColor" width="16" height="16">
            <path d="M459.5 440.6c9.5 7.9 22.8 9.7 34.1 4.4s18.4-16.6 18.4-29V96c0-12.4-7.2-23.7-18.4-29s-24.5-3.6-34.1 4.4L288 214.3V96c0-12.4-7.2-23.7-18.4-29s-24.5-3.6-34.1 4.4l-192 160c-7.3 6.1-11.5 15.1-11.5 24.6s4.2 18.5 11.5 24.6l192 160c9.5 7.9 22.8 9.7 34.1 4.4s18.4-16.6 18.4-29V297.7l171.5 142.9z"/>
          </svg>
        </button>
        <button class="vf-btn vf-skip" id="vf-skip-forward" title="Forward 10s">
          <svg viewBox="0 0 512 512" fill="currentColor" width="16" height="16">
            <path d="M52.5 440.6c-9.5 7.9-22.8 9.7-34.1 4.4S0 428.4 0 416V96C0 83.6 7.2 72.3 18.4 67s24.5-3.6 34.1 4.4L224 214.3V96c0-12.4 7.2-23.7 18.4-29s24.5-3.6 34.1 4.4l192 160c7.3 6.1 11.5 15.1 11.5 24.6s-4.2 18.5-11.5 24.6l-192 160c-9.5 7.9-22.8 9.7-34.1 4.4s-18.4-16.6-18.4-29V297.7L52.5 440.6z"/>
          </svg>
        </button>

        <!-- Voice Avatar (Microphone icon - FontAwesome-style) -->
        <div class="vf-avatar" id="vf-avatar" title="Voice: ${this.currentVoiceName} (click to change)">
          <svg viewBox="0 0 384 512" fill="currentColor" width="18" height="18">
            <path d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"/>
          </svg>
        </div>

        <!-- Speed Control -->
        <button class="vf-btn vf-speed" id="vf-speed" title="Playback Speed">
          <span id="vf-speed-text">${this.currentSpeed}x</span>
        </button>

        <!-- Read Selection (FontAwesome text-selection style) -->
        <button class="vf-btn" id="vf-selection" title="Read Selection">
          <svg viewBox="0 0 448 512" fill="currentColor" width="18" height="18">
            <path d="M0 64C0 46.3 14.3 32 32 32c229.8 0 416 186.2 416 416c0 17.7-14.3 32-32 32s-32-14.3-32-32C384 220.4 267.6 104 72 104V160c0 13.3-10.7 24-24 24S24 173.3 24 160V80 64H0zm0 224c0-17.7 14.3-32 32-32c123.5 0 224 100.5 224 224c0 17.7-14.3 32-32 32s-32-14.3-32-32c0-88.4-71.6-160-160-160c-17.7 0-32-14.3-32-32zm160 96a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
          </svg>
        </button>

        <!-- Waveform/Activity -->
        <div class="vf-waveform" id="vf-waveform">
          <div class="vf-wave"></div>
          <div class="vf-wave"></div>
          <div class="vf-wave"></div>
          <div class="vf-wave"></div>
          <div class="vf-wave"></div>
        </div>

        <!-- Settings (FontAwesome gear style) -->
        <button class="vf-btn" id="vf-settings" title="Settings">
          <svg viewBox="0 0 512 512" fill="currentColor" width="18" height="18">
            <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>
          </svg>
        </button>

        <!-- Collapse Button (FontAwesome chevron style) -->
        <button class="vf-btn vf-collapse" id="vf-collapse" title="Hide sidebar">
          <svg viewBox="0 0 320 512" fill="currentColor" width="14" height="14">
            <path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/>
          </svg>
        </button>
      </div>

      <!-- Status Toast -->
      <div class="vf-toast" id="vf-toast"></div>
    `;
    
    document.body.appendChild(sidebar);
    this.sidebar = sidebar;
    this.player = document.getElementById('vf-player');
  }

  setupEventListeners() {
    // Play/Pause button
    document.getElementById('vf-play').addEventListener('click', () => {
      if (this.isPlaying) {
        this.togglePause();
      } else {
        this.playSelectedText();
      }
    });

    // Collapse/Hide button
    document.getElementById('vf-collapse').addEventListener('click', () => {
      this.hideSidebar();
    });

    // Avatar - voice selector
    document.getElementById('vf-avatar').addEventListener('click', (e) => {
      e.stopPropagation();
      this.showVoiceSelector();
    });

    // Speed control
    document.getElementById('vf-speed').addEventListener('click', () => {
      this.cycleSpeed();
    });

    // Skip controls
    document.getElementById('vf-skip-back').addEventListener('click', () => {
      this.skip(-10);
    });
    document.getElementById('vf-skip-forward').addEventListener('click', () => {
      this.skip(10);
    });

    // Read Selection button
    document.getElementById('vf-selection').addEventListener('click', () => {
      this.playSelectedText();
    });

    // Settings button
    document.getElementById('vf-settings').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openSettings' });
    });

    // Text selection listener
    document.addEventListener('mouseup', (e) => {
      setTimeout(() => this.handleTextSelection(e), 10);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });

    // Click outside to close voice selector
    document.addEventListener('click', (e) => {
      const selector = document.getElementById('vf-voice-selector');
      if (selector && !selector.contains(e.target) && e.target.id !== 'vf-avatar') {
        selector.remove();
      }
    });

    // Listen for settings updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'settingsUpdated') {
        this.loadSettings();
        this.loadApiKeys();
      }
    });
  }

  handleTextSelection(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0) {
      this.selectedText = text;
      if (this.settings.autoShowSidebar && this.elevenLabsKey) {
        this.showSidebar();
      }
    }
  }

  handleKeyboard(e) {
    // Don't capture if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    switch (e.code) {
      case 'Space':
        if (this.isPlaying) {
          e.preventDefault();
          this.togglePause();
        }
        break;
      case 'ArrowLeft':
        if (this.isPlaying) {
          e.preventDefault();
          this.skip(-5);
        }
        break;
      case 'ArrowRight':
        if (this.isPlaying) {
          e.preventDefault();
          this.skip(5);
        }
        break;
      case 'ArrowUp':
        if (this.isPlaying) {
          e.preventDefault();
          this.increaseSpeed();
        }
        break;
      case 'ArrowDown':
        if (this.isPlaying) {
          e.preventDefault();
          this.decreaseSpeed();
        }
        break;
      case 'Escape':
        this.stop();
        break;
    }
  }

  async loadVoices() {
    if (!this.elevenLabsKey) return;

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.elevenLabsKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.availableVoices = data.voices || [];
        this.renderVoiceDropdown();
        
        // Update current voice name
        const currentVoice = this.availableVoices.find(v => v.voice_id === this.currentVoiceId);
        if (currentVoice) {
          this.currentVoiceName = currentVoice.name;
        }
        
        console.log('🎙️ Loaded', this.availableVoices.length, 'voices');
      }
    } catch (error) {
      console.error('🎙️ Failed to load voices:', error);
    }
  }

  renderVoiceDropdown() {
    // This method is now replaced by showVoiceSelector()
  }

  toggleVoiceDropdown() {
    // This method is now replaced by showVoiceSelector()
    this.showVoiceSelector();
  }

  showVoiceSelector() {
    // Remove existing selector
    const existing = document.getElementById('vf-voice-selector');
    if (existing) {
      existing.remove();
      return;
    }

    const selector = document.createElement('div');
    selector.id = 'vf-voice-selector';
    selector.innerHTML = `
      <div class="vf-voice-header">
        <span>Select Voice</span>
        <button class="vf-voice-close" id="vf-voice-close">×</button>
      </div>
      <div class="vf-voice-list" id="vf-voice-list">
        ${this.availableVoices.length === 0 ? '<div class="vf-voice-loading">Loading voices...</div>' : ''}
      </div>
    `;

    document.body.appendChild(selector);

    // Populate voices
    const list = document.getElementById('vf-voice-list');
    if (this.availableVoices.length > 0) {
      list.innerHTML = this.availableVoices.slice(0, 20).map(voice => `
        <div class="vf-voice-item ${voice.voice_id === this.currentVoiceId ? 'selected' : ''}"
             data-voice-id="${voice.voice_id}" data-voice-name="${voice.name}">
          <div class="vf-voice-avatar-small">${voice.name.substring(0, 2).toUpperCase()}</div>
          <div class="vf-voice-info">
            <div class="vf-voice-name">${voice.name}</div>
            <div class="vf-voice-labels">${voice.labels?.accent || ''} ${voice.labels?.gender || ''}</div>
          </div>
          <button class="vf-voice-preview" data-voice-id="${voice.voice_id}">▶ Test</button>
        </div>
      `).join('');

      // Add click handlers
      list.querySelectorAll('.vf-voice-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('vf-voice-preview')) return;
          this.selectVoice(item.dataset.voiceId, item.dataset.voiceName);
          selector.remove();
        });
      });

      // Preview buttons
      list.querySelectorAll('.vf-voice-preview').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.previewVoice(btn.dataset.voiceId);
        });
      });
    }

    // Close button
    document.getElementById('vf-voice-close').addEventListener('click', () => {
      selector.remove();
    });
  }

  async previewVoice(voiceId) {
    this.showToast('🔊 Previewing voice...');
    const previewText = 'Hello! This is how I sound.';
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: previewText,
          model_id: 'eleven_flash_v2_5'
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
      } else {
        throw new Error(`ElevenLabs error: ${response.status}`);
      }
    } catch (error) {
      console.error('Preview failed:', error);
      this.showToast('Preview failed - check API key', 'error');
    }
  }

  selectVoice(voiceId, voiceName) {
    this.currentVoiceId = voiceId;
    this.currentVoiceName = voiceName;
    
    // Update avatar title
    const avatar = document.getElementById('vf-avatar');
    if (avatar) {
      avatar.title = `Voice: ${voiceName} (click to change)`;
    }
    
    // Save preference
    chrome.storage.local.set({ defaultVoice: voiceId });
    
    this.showToast(`Voice: ${voiceName}`);
  }

  async playSelectedText() {
    const text = this.selectedText || window.getSelection().toString().trim();
    
    if (!text) {
      this.showToast('Please select some text to read', 'error');
      return;
    }

    if (!this.elevenLabsKey) {
      this.showToast('Please configure your ElevenLabs API key', 'error');
      chrome.runtime.sendMessage({ action: 'openSettings' });
      return;
    }

    await this.speak(text);
  }

  async speak(text) {
    if (!text || this.isLoading) return;
    
    this.stop(); // Stop any current playback
    this.isLoading = true;
    this.currentText = text;
    this.updatePlayButton('loading');
    this.expandPlayer();
    
    try {
      // Call ElevenLabs TTS with timestamps API
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.currentVoiceId}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsKey
          },
          body: JSON.stringify({
            text: text.substring(0, 5000), // ElevenLabs limit
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

      const data = await response.json();
      
      // Extract audio and timing data
      const audioBase64 = data.audio_base64;
      const alignment = data.alignment;
      
      if (!audioBase64) {
        throw new Error('No audio data received');
      }

      // Process word timings from character alignment
      if (alignment && this.settings.highlightWords) {
        this.wordTimings = this.extractWordTimings(alignment, text);
      }

      // Create and play audio
      const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
      this.audio = new Audio(URL.createObjectURL(audioBlob));
      this.audio.playbackRate = this.currentSpeed;
      
      // Audio event handlers
      this.audio.onplay = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.updatePlayButton('playing');
        this.startHighlighting();
      };
      
      this.audio.onpause = () => {
        this.isPaused = true;
        this.updatePlayButton('paused');
      };
      
      this.audio.onended = () => {
        this.stop();
        this.showToast('Finished reading ✓', 'success');
      };
      
      this.audio.ontimeupdate = () => {
        this.updateProgress();
      };

      await this.audio.play();
      
    } catch (error) {
      console.error('🎙️ TTS Error:', error);
      this.showToast(`Error: ${error.message}`, 'error');
      this.stop();
    } finally {
      this.isLoading = false;
    }
  }

  extractWordTimings(alignment, originalText) {
    const timings = [];
    const chars = alignment.characters || [];
    const startTimes = alignment.character_start_times_seconds || [];
    const endTimes = alignment.character_end_times_seconds || [];
    
    let currentWord = '';
    let wordStart = 0;
    let wordEnd = 0;
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      
      if (char === ' ' || char === '\n' || char === '\r') {
        if (currentWord.length > 0) {
          timings.push({
            word: currentWord,
            start: wordStart,
            end: wordEnd
          });
          currentWord = '';
        }
      } else {
        if (currentWord.length === 0) {
          wordStart = startTimes[i] || 0;
        }
        currentWord += char;
        wordEnd = endTimes[i] || wordStart;
      }
    }
    
    // Don't forget the last word
    if (currentWord.length > 0) {
      timings.push({
        word: currentWord,
        start: wordStart,
        end: wordEnd
      });
    }
    
    this.words = timings.map(t => t.word);
    return timings;
  }

  startHighlighting() {
    if (!this.settings.highlightWords || this.wordTimings.length === 0) return;
    
    // Update text preview
    this.updateTextPreview();
    
    // Clear any existing interval
    if (this.highlightInterval) {
      clearInterval(this.highlightInterval);
    }
    
    this.highlightInterval = setInterval(() => {
      if (!this.audio || this.isPaused) return;
      
      const currentTime = this.audio.currentTime;
      
      // Find current word based on time
      for (let i = 0; i < this.wordTimings.length; i++) {
        const timing = this.wordTimings[i];
        if (currentTime >= timing.start && currentTime <= timing.end + 0.1) {
          if (this.currentWordIndex !== i) {
            this.currentWordIndex = i;
            this.updateTextPreview();
          }
          break;
        }
      }
    }, 50); // Check every 50ms for smooth highlighting
  }

  updateTextPreview() {
    const preview = document.getElementById('vf-preview');
    if (!preview || this.words.length === 0) return;
    
    // Show a window of words around the current word
    const windowSize = 15;
    const start = Math.max(0, this.currentWordIndex - 5);
    const end = Math.min(this.words.length, start + windowSize);
    
    const html = this.words.slice(start, end).map((word, idx) => {
      const actualIdx = start + idx;
      if (actualIdx === this.currentWordIndex) {
        return `<span class="current-word">${word}</span>`;
      }
      return word;
    }).join(' ');
    
    preview.innerHTML = html;
  }

  updateProgress() {
    if (!this.audio) return;
    
    // Update timer display
    document.getElementById('vf-timer').textContent = this.formatTime(this.audio.currentTime);
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  togglePause() {
    if (!this.audio) return;
    
    if (this.isPaused) {
      this.audio.play();
      this.isPaused = false;
      this.updatePlayButton('playing');
    } else {
      this.audio.pause();
      this.isPaused = true;
      this.updatePlayButton('paused');
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      URL.revokeObjectURL(this.audio.src);
      this.audio = null;
    }
    
    if (this.highlightInterval) {
      clearInterval(this.highlightInterval);
      this.highlightInterval = null;
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    this.isLoading = false;
    this.currentWordIndex = 0;
    this.words = [];
    this.wordTimings = [];
    
    // Reset timer display
    const timer = document.getElementById('vf-timer');
    if (timer) timer.textContent = '0:00';
    
    this.updatePlayButton('stopped');
    this.collapsePlayer();
    this.clearHighlights();
  }

  skip(seconds) {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + seconds));
  }

  cycleSpeed() {
    const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(this.currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.currentSpeed = speeds[nextIndex];
    
    if (this.audio) {
      this.audio.playbackRate = this.currentSpeed;
    }
    
    document.getElementById('vf-speed-text').textContent = `${this.currentSpeed}x`;
    chrome.storage.local.set({ defaultSpeed: this.currentSpeed.toString() });
    this.showToast(`Speed: ${this.currentSpeed}x`);
  }

  increaseSpeed() {
    const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(this.currentSpeed);
    if (currentIndex < speeds.length - 1) {
      this.currentSpeed = speeds[currentIndex + 1];
      if (this.audio) this.audio.playbackRate = this.currentSpeed;
      document.getElementById('vf-speed-text').textContent = `${this.currentSpeed}x`;
      this.showToast(`Speed: ${this.currentSpeed}x`);
    }
  }

  decreaseSpeed() {
    const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = speeds.indexOf(this.currentSpeed);
    if (currentIndex > 0) {
      this.currentSpeed = speeds[currentIndex - 1];
      if (this.audio) this.audio.playbackRate = this.currentSpeed;
      document.getElementById('vf-speed-text').textContent = `${this.currentSpeed}x`;
      this.showToast(`Speed: ${this.currentSpeed}x`);
    }
  }

  updatePlayButton(state) {
    const btn = document.getElementById('vf-play');
    const avatar = document.getElementById('vf-avatar');
    const waveform = document.getElementById('vf-waveform');
    const playIcon = btn.querySelector('.vf-icon-play');
    const pauseIcon = btn.querySelector('.vf-icon-pause');
    
    switch (state) {
      case 'loading':
        btn.disabled = true;
        btn.classList.add('loading');
        btn.classList.remove('playing');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        break;
      case 'playing':
        btn.disabled = false;
        btn.classList.add('playing');
        btn.classList.remove('loading');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        avatar.classList.add('speaking');
        waveform.classList.add('active');
        break;
      case 'paused':
        btn.disabled = false;
        btn.classList.remove('playing', 'loading');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        avatar.classList.remove('speaking');
        waveform.classList.remove('active');
        break;
      case 'stopped':
      default:
        btn.disabled = false;
        btn.classList.remove('playing', 'loading');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        avatar.classList.remove('speaking');
        waveform.classList.remove('active');
        break;
    }
  }

  expandPlayer() {
    if (this.player) {
      this.player.classList.add('expanded');
    }
    this.isExpanded = true;
  }

  collapsePlayer() {
    if (this.player) {
      this.player.classList.remove('expanded');
    }
    this.isExpanded = false;
  }

  showSidebar() {
    this.sidebar.classList.remove('hidden');
  }

  hideSidebar() {
    this.stop();
    this.sidebar.classList.add('hidden');
  }

  clearHighlights() {
    document.querySelectorAll('.vf-highlight-word').forEach(el => {
      el.classList.remove('vf-highlight-word');
    });
  }

  base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('vf-toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `vf-toast ${type} show`;
    
    // Auto remove after 3 seconds
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new VoiceFlowSidebar());
} else {
  new VoiceFlowSidebar();
}
