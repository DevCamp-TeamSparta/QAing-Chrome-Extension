// background.js
// import axios from 'axios'

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
// 	if (message.action === 'performRequest') {
// 		const formData = message.data

// 		// 여기에서 axios 또는 fetch 등을 사용하여 서버에 요청을 보냅니다.
// 		axios
// 			.post(`https://15.165.15.241/videos/process`, formData)
// 			.then((response) => {
// 				console.log(response.data)
// 				sendResponse({ success: true, data: response.data })
// 			})
// 			.catch((error) => {
// 				console.error(error)
// 				alert('요청을 실패')
// 				sendResponse({ success: false, error: error.message })
// 			})

// 		// 비동기 처리가 완료되기 전에 sendResponse를 호출해야 합니다.
// 		// return alert('요청을 완료했습니다.')
// 	}

//모든 페이지에 아이콘 클릭시 레코더 띄우기(contentScript.js)
let isActive = false
chrome.action.onClicked.addListener(async () => {
	isActive = !isActive
	const tabs = await chrome.tabs.query({ currentWindow: true })
	if (isActive) {
		console.log('isActive', isActive)
		console.log(tabs)
		tabs.forEach((item) => {
			item.id &&
				chrome.scripting.executeScript({
					target: { tabId: item.id },
					files: ['contentScript.js'],
				})
		})
	}
	if (!isActive) {
		console.log('isActive false', isActive)
		chrome.tabs.query({}, function (tabs) {
			tabs.forEach(function (tab) {
				console.log('fals tabs', tab)
				tab.id &&
					chrome.tabs
						.sendMessage(tab.id, { extensionIsActive: false })
						.catch((err) => console.error(err))
			})
		})
	}
})

//로그인 토큰 가져오기
const HOMEPAGE_ADDR = process.env.CHROME_EXENSION_HOMEPAGE_LOCAL || ''
const HOMEPAGE_QAING = process.env.CHROME_EXENSION_HOMEPAGE_QAING || ''

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'getToken') {
		console.log('getToken 메시지를 받았습니다.')
		chrome.cookies
			.get({ url: HOMEPAGE_QAING, name: 'access-token' })
			.then((response) => {
				const accessToken = response ? response.value : null
				sendResponse({ accessToken: accessToken })
			})
			.catch((error) => {
				console.error('쿠키를 가져오는 중 오류 발생:', error)
				sendResponse({
					accessToken: null,
					error: '쿠키를 가져오는 중 오류 발생',
				})
			})
	}

	return true
})

//카운터
let timer: string | number | NodeJS.Timeout | undefined
let count = 0

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.command === 'startTimer') {
		clearInterval(timer)
		timer = setInterval(() => {
			count++
			chrome.tabs.query({}, (tabs) => {
				tabs.forEach((tab) => {
					tab.id && chrome.tabs.sendMessage(tab.id, { time: count })
				})
			})
		}, 1000)
	} else if (request.command === 'stopTimer') {
		clearInterval(timer)
		count = 0
	}
})
