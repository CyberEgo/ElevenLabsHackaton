// VoiceFlow Background Service Worker
// Handles extension lifecycle and messaging

console.log('🎙️ VoiceFlow background service worker started');

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🎙️ VoiceFlow installed:', details.reason);
  
  if (details.reason === 'install') {
    // Open settings page on first install
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'openSettings':
      chrome.tabs.create({
        url: chrome.runtime.getURL('settings.html')
      });
      sendResponse({ success: true });
      break;
      
    case 'getApiKeys':
      chrome.storage.local.get(['elevenLabsKey', 'claudeKey'], (result) => {
        sendResponse({
          elevenLabsKey: result.elevenLabsKey || '',
          claudeKey: result.claudeKey || ''
        });
      });
      return true; // Keep channel open for async response
      
    case 'checkApiKeyStatus':
      chrome.storage.local.get(['elevenLabsKey', 'claudeKey'], (result) => {
        sendResponse({
          hasElevenLabs: !!result.elevenLabsKey,
          hasClaude: !!result.claudeKey
        });
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true;
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log('🎙️ Command received:', command);
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'keyboardCommand', 
        command: command 
      }).catch(() => {
        // Tab might not have content script
        console.log('🎙️ Could not send command to tab');
      });
    }
  });
});

// Context menu for quick access (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'voiceflow-read',
    title: '🎧 Read with VoiceFlow',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'voiceflow-read' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'readText',
      text: info.selectionText
    }).catch(console.error);
  }
});
