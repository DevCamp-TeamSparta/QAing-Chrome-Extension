chrome.runtime.onInstalled.addListener((details) => {
	chrome.contextMenus.create({
		title: 'Test Context Menu',
		id: 'contextMenu1',
		contexts: ['page', 'selection'],
	})
})

console.log('background script running')
