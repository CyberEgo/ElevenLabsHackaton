// Lexia Sidebar - Speechify-style floating player
// Direct ElevenLabs API calls with word-by-word highlighting

class LexiaSidebar {
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
    
    // On-page highlighting state
    this.selectionRange = null;
    this.highlightContainer = null;
    this.wordSpans = [];
    
    // Dictation state (WhisperFlow-style)
    this.isDictating = false;
    this.dictationRecognition = null;
    this.dictationText = '';
    this.targetElement = null;
    this.lastFocusedInput = null;
    this.dictationStartTime = null;
    
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
    this.setupWhisperFlowDictation();
    this.setupInputTracking();
    this.loadVoices();
    console.log('🎙️ Lexia Sidebar initialized');
  }

  setupInputTracking() {
    // Track which input element was last focused for dictation insertion
    document.addEventListener('focusin', (e) => {
      if (this.isEditableElement(e.target)) {
        this.lastFocusedInput = e.target;
        console.log('🎤 Tracking input:', e.target.tagName, e.target.id || e.target.name || '');
      }
    }, true); // Use capture phase to ensure we see all focus events
  }

  isEditableElement(el) {
    if (!el) return false;
    // Exclude our own sidebar elements
    if (el.closest && el.closest('#lexia-sidebar')) return false;
    return el.tagName === 'INPUT' ||
           el.tagName === 'TEXTAREA' ||
           el.isContentEditable ||
           el.getAttribute('role') === 'textbox';
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
    const existing = document.getElementById('lexia-sidebar');
    if (existing) existing.remove();

    // Create sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'lexia-sidebar';
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

        <!-- Skip Controls (Simple text arrows) -->
        <button class="vf-btn vf-skip" id="vf-skip-back" title="Back 10s">
          <span>«</span>
        </button>
        <button class="vf-btn vf-skip" id="vf-skip-forward" title="Forward 10s">
          <span>»</span>
        </button>

        <!-- Mic Button (WhisperFlow hold-to-dictate) -->
        <button class="vf-btn vf-mic" id="vf-mic" title="Hold to Dictate (WhisperFlow)">
          <svg viewBox="0 0 384 512" fill="currentColor" width="16" height="16">
            <path d="M192 0C139 0 96 43 96 96V256c0 53 43 96 96 96s96-43 96-96V96c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 89.1 66.2 162.7 152 174.4V464H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H216V430.4c85.8-11.7 152-85.3 152-174.4V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 70.7-57.3 128-128 128s-128-57.3-128-128V216z"/>
          </svg>
        </button>

        <!-- Speed Control -->
        <button class="vf-btn vf-speed" id="vf-speed" title="Playback Speed">
          <span id="vf-speed-text">${this.currentSpeed}x</span>
        </button>

        <!-- Read Selection (Grid/Selection icon) -->
        <button class="vf-btn" id="vf-selection" title="Read Selection">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
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

      <!-- Dictation Display (WhisperFlow floating text) -->
      <div class="vf-dictation-display" id="vf-dictation-display">
        <div class="vf-dictation-text" id="vf-dictation-text"></div>
        <div class="vf-dictation-hint">Release to insert • ESC to cancel</div>
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

    // Mic button - WhisperFlow hold-to-dictate
    const micBtn = document.getElementById('vf-mic');
    micBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDictation();
    });
    micBtn.addEventListener('mouseup', () => this.stopDictation(true));
    micBtn.addEventListener('mouseleave', () => {
      if (this.isDictating) this.stopDictation(true);
    });
    // Touch support
    micBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDictation();
    });
    micBtn.addEventListener('touchend', () => this.stopDictation(true));

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

    // V key release for dictation
    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyV' && this.isDictating) {
        this.stopDictation(true);
      }
    });

    // Listen for settings updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'settingsUpdated') {
        this.loadSettings();
        this.loadApiKeys();
        this.loadVoices();
      }
    });
  }

  handleTextSelection(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text && text.length > 0) {
      this.selectedText = text;
      // Store the selection range for highlighting
      if (selection.rangeCount > 0) {
        this.selectionRange = selection.getRangeAt(0).cloneRange();
      }
      if (this.settings.autoShowSidebar && this.elevenLabsKey) {
        this.showSidebar();
      }
    }
  }

  handleKeyboard(e) {
    // V key for dictation works in input fields too
    if (e.code === 'KeyV' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.isEditableElement(document.activeElement)) {
        e.preventDefault();
        this.startDictation();
        return;
      }
    }

    // Don't capture other shortcuts if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      if (e.code === 'Escape' && this.isDictating) {
        this.stopDictation(false); // Cancel without inserting
      }
      return;
    }

    switch (e.code) {
      case 'Space':
        if (this.isPlaying) {
          e.preventDefault();
          this.togglePause();
        }
        break;
      case 'KeyV':
        if (!e.repeat) {
          e.preventDefault();
          this.startDictation();
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
        if (this.isDictating) {
          this.stopDictation(false); // Cancel without inserting
        } else {
          this.stop();
        }
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
        
        // Update current voice name from saved voice ID
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
    // Voice selection is now in settings page
  }

  toggleVoiceDropdown() {
    // Voice selection is now in settings page
    this.showToast(`Voice: ${this.currentVoiceName} (change in Settings)`);
  }

  showVoiceSelector() {
    // Voice selection moved to settings page
    this.showToast(`Voice: ${this.currentVoiceName} (change in Settings)`);
  }

  // WhisperFlow-style Dictation Setup
  setupWhisperFlowDictation() {
    console.log('🎤 Setting up WhisperFlow dictation...');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('🎤 Speech recognition not supported for dictation');
      return;
    }

    this.dictationRecognition = new SpeechRecognition();
    this.dictationRecognition.continuous = true;
    this.dictationRecognition.interimResults = true;
    this.dictationRecognition.lang = 'en-US';

    this.dictationRecognition.onstart = () => {
      console.log('🎤 WhisperFlow dictation started');
      this.dictationStartTime = Date.now();
    };

    this.dictationRecognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update the dictation display
      const displayText = finalTranscript || interimTranscript;
      this.dictationText = displayText;
      this.updateDictationDisplay(displayText, !finalTranscript);

      console.log('🎤 Dictation:', displayText, finalTranscript ? '(final)' : '(interim)');
    };

    this.dictationRecognition.onerror = (event) => {
      console.error('🎤 Dictation error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.showToast('Dictation error: ' + event.error, 'error');
      }
    };

    this.dictationRecognition.onend = () => {
      console.log('🎤 Dictation recognition ended');
      // If still dictating (user holding button), restart
      if (this.isDictating) {
        try {
          this.dictationRecognition.start();
        } catch (e) {
          // Already started or other error
        }
      }
    };
  }

  // Start WhisperFlow-style dictation
  startDictation() {
    if (this.isDictating) return;

    console.log('🎤 Starting WhisperFlow dictation...');
    this.isDictating = true;
    this.dictationText = '';

    // Pause any TTS playback
    if (this.isPlaying && !this.isPaused) {
      this.togglePause();
    }

    // Find and store the target element (focused input or last active)
    this.targetElement = this.findTargetElement();

    // Update UI
    const micBtn = document.getElementById('vf-mic');
    micBtn.classList.add('dictating');

    // Show dictation display
    const display = document.getElementById('vf-dictation-display');
    const textEl = document.getElementById('vf-dictation-text');
    textEl.textContent = '';
    display.classList.add('active');

    // Start recognition
    if (this.dictationRecognition) {
      try {
        this.dictationRecognition.start();
        this.showToast('🎤 Speak now...');
      } catch (e) {
        console.error('🎤 Failed to start dictation:', e);
        this.showToast('Failed to start dictation', 'error');
        this.isDictating = false;
        micBtn.classList.remove('dictating');
        display.classList.remove('active');
      }
    } else {
      this.showToast('Speech recognition not available', 'error');
      this.isDictating = false;
      micBtn.classList.remove('dictating');
      display.classList.remove('active');
    }
  }

  // Stop dictation and optionally insert text
  stopDictation(insertText = true) {
    if (!this.isDictating) return;

    console.log('🎤 Stopping dictation, insert:', insertText, 'text:', this.dictationText);
    this.isDictating = false;

    // Stop recognition
    if (this.dictationRecognition) {
      try {
        this.dictationRecognition.stop();
      } catch (e) {
        // Already stopped
      }
    }

    // Update UI
    const micBtn = document.getElementById('vf-mic');
    micBtn.classList.remove('dictating');

    const display = document.getElementById('vf-dictation-display');
    display.classList.remove('active');

    const textToProcess = this.dictationText.trim();

    // Check if user cancelled
    if (!insertText) {
      this.showToast('❌ Cancelled');
      this.clearDictationState();
      return;
    }

    if (textToProcess) {
      // Insert the dictated text
      this.insertDictatedText(textToProcess);
      this.showToast(`✅ Inserted: "${textToProcess.substring(0, 30)}${textToProcess.length > 30 ? '...' : ''}"`);
    } else {
      this.showToast('No text captured');
    }

    this.clearDictationState();
  }

  clearDictationState() {
    this.dictationText = '';
    this.targetElement = null;
  }

  findTargetElement() {
    // Priority 1: Currently focused editable element
    const active = document.activeElement;
    if (this.isEditableElement(active)) {
      return active;
    }

    // Priority 2: Last focused input (stored)
    if (this.lastFocusedInput && document.body.contains(this.lastFocusedInput)) {
      return this.lastFocusedInput;
    }

    // Priority 3: Find first visible input/textarea on page (excluding our sidebar)
    const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea, [contenteditable="true"]');
    for (const input of inputs) {
      if (this.isVisible(input) && !input.closest('#lexia-sidebar')) {
        return input;
      }
    }

    return null;
  }

  isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top < window.innerHeight && rect.bottom > 0;
  }

  insertDictatedText(text) {
    const target = this.targetElement || this.findTargetElement();
    
    if (!target) {
      // No target found - copy to clipboard as fallback
      console.log('🎤 No target element for dictation, copying to clipboard');
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('📋 Copied to clipboard (no input focused)');
      });
      return;
    }

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Insert at cursor position
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      target.value = value.substring(0, start) + text + value.substring(end);
      target.selectionStart = target.selectionEnd = start + text.length;
      target.focus();
      // Trigger input event for frameworks
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (target.isContentEditable) {
      // Insert at cursor in contenteditable
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      } else {
        target.textContent += text;
      }
      target.focus();
      // Trigger input event
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  updateDictationDisplay(text, isInterim = false) {
    const textEl = document.getElementById('vf-dictation-text');
    if (textEl) {
      textEl.textContent = text;
      textEl.classList.toggle('interim', isInterim);
    }
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
    
    // Save the selection range BEFORE calling stop() which clears it
    const savedSelectionRange = this.selectionRange;
    
    this.stop(); // Stop any current playback (this clears selectionRange)
    
    // Restore the selection range
    this.selectionRange = savedSelectionRange;
    
    this.isLoading = true;
    this.currentText = text;
    this.updatePlayButton('loading');
    this.expandPlayer();
    
    // Wrap the selected text with highlight spans on the page
    console.log('🎨 About to wrap, selectionRange exists:', !!this.selectionRange, 'highlightWords:', this.settings.highlightWords);
    if (this.settings.highlightWords && this.selectionRange) {
      this.wrapSelectionWithHighlights();
    } else {
      console.log('🎨 Skipping wrap - no selection range or highlighting disabled');
    }
    
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
    console.log('🎨 startHighlighting called, wordTimings:', this.wordTimings.length, 'wordSpans:', this.wordSpans.length);
    
    if (!this.settings.highlightWords) {
      console.log('🎨 Highlighting disabled in settings');
      return;
    }
    
    if (this.wordTimings.length === 0) {
      console.log('🎨 No word timings available');
      return;
    }
    
    if (this.wordSpans.length === 0) {
      console.log('🎨 No word spans on page - selection may not have been wrapped');
      return;
    }
    
    // Clear any existing interval
    if (this.highlightInterval) {
      clearInterval(this.highlightInterval);
    }
    
    console.log('🎨 Starting highlight interval, first few timings:', this.wordTimings.slice(0, 3));
    
    this.highlightInterval = setInterval(() => {
      if (!this.audio || this.isPaused) return;
      
      const currentTime = this.audio.currentTime;
      
      // Find current word based on time
      for (let i = 0; i < this.wordTimings.length; i++) {
        const timing = this.wordTimings[i];
        if (currentTime >= timing.start && currentTime <= timing.end + 0.1) {
          if (this.currentWordIndex !== i) {
            this.currentWordIndex = i;
            // Make sure we don't go beyond wordSpans array
            if (i < this.wordSpans.length) {
              this.highlightCurrentWord(i);
            }
          }
          break;
        }
      }
    }, 50); // Check every 50ms for smooth highlighting
  }

  highlightCurrentWord(index) {
    // Remove highlight from all word spans
    this.wordSpans.forEach(span => {
      span.classList.remove('lexia-word-current');
      // Reset inline styles
      span.style.background = '';
      span.style.color = '';
      span.style.fontWeight = '';
      span.style.boxShadow = '';
    });
    
    // Add highlight to current word
    if (this.wordSpans[index]) {
      const span = this.wordSpans[index];
      span.classList.add('lexia-word-current');
      
      // Apply inline styles as backup (in case CSS class doesn't work)
      span.style.cssText = 'display: inline !important; background: rgba(0, 180, 216, 0.6) !important; color: #000 !important; font-weight: 600 !important; padding: 2px 4px !important; border-radius: 4px !important; box-shadow: 0 2px 8px rgba(0, 180, 216, 0.5) !important; transition: all 0.15s ease !important;';
      
      console.log('🎨 Highlighting word', index, ':', span.textContent);
      
      // Scroll the word into view if needed
      span.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }

  wrapSelectionWithHighlights() {
    if (!this.selectionRange) {
      console.log('🎨 No selection range to wrap');
      return;
    }
    
    try {
      console.log('🎨 Wrapping selection with highlights...');
      
      // Create a container for the highlighted text
      const container = document.createElement('span');
      container.className = 'lexia-highlight-container';
      container.style.cssText = 'display: inline !important;';
      
      // Extract the selected content
      const fragment = this.selectionRange.extractContents();
      
      // Get all text content and split into words
      const textContent = fragment.textContent || '';
      const words = textContent.split(/\s+/).filter(w => w.length > 0);
      
      console.log('🎨 Found', words.length, 'words to highlight:', words.slice(0, 5), '...');
      
      // Create spans for each word
      this.wordSpans = [];
      words.forEach((word, i) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'lexia-word';
        // Add inline styles as backup in case CSS doesn't load
        wordSpan.style.cssText = 'display: inline !important; padding: 2px 0 !important; border-radius: 3px !important; transition: all 0.15s ease !important;';
        wordSpan.textContent = word;
        wordSpan.dataset.index = i;
        this.wordSpans.push(wordSpan);
        container.appendChild(wordSpan);
        
        // Add space after word (except last)
        if (i < words.length - 1) {
          container.appendChild(document.createTextNode(' '));
        }
      });
      
      // Insert the container into the range
      this.selectionRange.insertNode(container);
      this.highlightContainer = container;
      
      console.log('🎨 Created', this.wordSpans.length, 'word spans');
      
      // Clear the browser selection
      window.getSelection().removeAllRanges();
      
    } catch (e) {
      console.error('🎨 Failed to wrap selection with highlights:', e);
    }
  }

  updateTextPreview() {
    // This method is kept for backward compatibility but highlighting
    // now happens directly on the page via highlightCurrentWord()
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
        waveform.classList.add('active');
        break;
      case 'paused':
        btn.disabled = false;
        btn.classList.remove('playing', 'loading');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        waveform.classList.remove('active');
        break;
      case 'stopped':
      default:
        btn.disabled = false;
        btn.classList.remove('playing', 'loading');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
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
    // Remove the highlight container and restore original text
    if (this.highlightContainer) {
      try {
        const parent = this.highlightContainer.parentNode;
        if (parent) {
          // Get the text content from the container
          const textContent = this.highlightContainer.textContent;
          const textNode = document.createTextNode(textContent);
          parent.replaceChild(textNode, this.highlightContainer);
          // Normalize to merge adjacent text nodes
          parent.normalize();
        }
      } catch (e) {
        console.error('Failed to clear highlights:', e);
      }
      this.highlightContainer = null;
    }
    this.wordSpans = [];
    this.selectionRange = null;
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
  document.addEventListener('DOMContentLoaded', () => new LexiaSidebar());
} else {
  new LexiaSidebar();
}
