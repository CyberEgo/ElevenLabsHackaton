// Lexia Content Script
// Handles page interaction and text extraction

console.log('🎙️ Lexia content script loaded');

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getPageContent':
      const article = document.querySelector('article, main, .content, .post-content, .entry-content');
      sendResponse({
        title: document.title,
        url: window.location.href,
        content: (article || document.body).innerText.substring(0, 10000)
      });
      break;
      
    case 'getSelectedText':
      const selection = window.getSelection().toString().trim();
      sendResponse({ text: selection });
      break;
      
    case 'settingsUpdated':
      // Settings were updated, sidebar will handle reloading
      console.log('🎙️ Settings updated');
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async response
});

// Expose helper function for getting readable content
window.LexiaGetContent = function() {
  // Try to find the main content area
  const selectors = [
    'article',
    'main',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '[role="main"]',
    '#content',
    '#main'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.length > 200) {
      return element.innerText;
    }
  }
  
  // Fallback to body
  return document.body.innerText;
};
