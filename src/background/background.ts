chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('message received in background script:', message)
})
