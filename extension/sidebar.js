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

        <!-- Play/Pause Button -->
        <button class="vf-btn vf-play-btn" id="vf-play" title="Play/Pause (Space)">
          <svg class="vf-icon-play" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg class="vf-icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>

        <!-- Skip Controls -->
        <button class="vf-btn vf-skip" id="vf-skip-back" title="Back 10s">
          <span>«</span>
        </button>
        <button class="vf-btn vf-skip" id="vf-skip-forward" title="Forward 10s">
          <span>»</span>
        </button>

        <!-- Voice Avatar -->
        <div class="vf-avatar" id="vf-avatar" title="Voice: ${this.currentVoiceName} (click to change)">
          🎙️
        </div>

        <!-- Speed Control -->
        <button class="vf-btn vf-speed" id="vf-speed" title="Playback Speed">
          <span id="vf-speed-text">${this.currentSpeed}x</span>
        </button>

        <!-- Read Selection -->
        <button class="vf-btn" id="vf-selection" title="Read Selection">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M3 5h2V3H3v2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2V3h-2zM5 21v-2H3v2h2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8v-2h-2v2h2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z"/>
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

        <!-- Settings -->
        <button class="vf-btn" id="vf-settings" title="Settings">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>

        <!-- Collapse Button -->
        <button class="vf-btn vf-collapse" id="vf-collapse" title="Hide sidebar">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
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
