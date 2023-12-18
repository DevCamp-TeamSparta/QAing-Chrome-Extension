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

let beforeTabId: number | undefined
let isActive = false
chrome.action.onClicked.addListener(async () => {
	isActive = !isActive
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
	if (isActive) {
		console.log('isActive', isActive)
		console.log(tabs)
		if (tabs.length > 0 && tabs[0].id) {
			beforeTabId = tabs[0].id
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				files: ['contentScript.js'],
			})
		}
	}
	if (!isActive) {
		console.log('isActive false', isActive)
		chrome.tabs.query({}, function (tabs) {
			tabs.forEach(function (tab) {
				tab.id &&
					chrome.tabs
						.sendMessage(tab.id, { extensionIsActive: false })
						.catch((err) => console.error(err))
			})
		})
	}
})

const closeBeforeTab = () => {
	console.log('beforeTabID', beforeTabId)
	beforeTabId &&
		chrome.tabs
			.sendMessage(beforeTabId, { extensionIsActive: false })
			.catch((err) => console.error(err))
}

const closRecorder = () => {
	chrome.tabs.query({}, function (tabs) {
		tabs.forEach(function (tab) {
			tab.id &&
				chrome.tabs
					.sendMessage(tab.id, { extensionIsActive: false })
					.catch((err) => console.error(err))
		})
	})
}

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
// 	if (request.command === 'deActive') {
// 		console.log('deActive')
// 		isActive = !isActive
// 	}
// })

//탭활성화시 보낼 메세지

chrome.tabs.onUpdated.addListener(async function (tab) {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
	if (isActive) {
		console.log('isActive', isActive)
		console.log(tabs)
		if (tabs.length > 0 && tabs[0].id) {
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				files: ['contentScript.js'],
			})
		}
	}
	if (!isActive) {
		console.log('isActive false', isActive)
		chrome.tabs.query({}, function (tabs) {
			tabs.forEach(function (tab) {
				tab.id &&
					chrome.tabs
						.sendMessage(tab.id, { extensionIsActive: false })
						.catch((err) => console.error(err))
			})
		})
	}
})

// chrome.tabs.onCreated.addListener(async function (tab) {})

chrome.tabs.onActivated.addListener(async function (tab) {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
	if (isActive) {
		// console.log('isActive', isActive)
		// console.log(tabs)
		if (tabs.length > 0 && tabs[0].id) {
			closeBeforeTab()
			console.log('currentTabId', tabs[0].id)
			beforeTabId = tabs[0].id
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				files: ['contentScript.js'],
			})
		}
	}
	if (!isActive) {
		console.log('isActive false', isActive)
		chrome.tabs.query({}, function (tabs) {
			tabs.forEach(function (tab) {
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
// let timer: string | number | NodeJS.Timeout | undefined
// let count = 0

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
// 	if (request.command === 'startTimer') {
// 		clearInterval(timer)
// 		timer = setInterval(() => {
// 			count++
// 			chrome.tabs.query({}, (tabs) => {
// 				tabs.forEach((tab) => {
// 					tab.id && chrome.tabs.sendMessage(tab.id, { time: count })
// 				})
// 			})
// 		}, 1000)
// 	} else if (request.command === 'stopTimer') {
// 		clearInterval(timer)
// 		count = 0
// 	}
// })

// 시작 버튼을 누르면 options페이지로 이동
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === 'createAndMoveTab') {
		chrome.tabs.create({ url: 'options.html' }, function (newTab) {
			newTab.id && chrome.tabs.move(newTab.id, { index: 0 })
		})
	}
})

// 종료 버튼을 누르면 contentScript에서 options페이지로 이동
chrome.runtime.onMessage.addListener(
	async function (request, sender, sendResponse) {
		if (request.action === 'stopRecordingToBackgournd') {
			console.log('stopRecordingToBackgournd')
			closRecorder()
			isActive = false
			chrome.tabs.query(
				{ url: chrome.runtime.getURL('options.html') },
				function (tabs) {
					// 옵션 페이지 탭이 열려 있으면 메시지 전송
					console.log('stopRecordingToBackgournd tabs', tabs)
					tabs[0].id &&
						chrome.tabs.sendMessage(tabs[0].id, {
							action: 'stopRecordingToOptions',
							timeRecords: timeRecords,
						})
				},
			)
		}
	},
)

let isRecording = false
let timer = 0
let timerInterval: NodeJS.Timeout | null = null
let timeRecords: number[] = [] // 타임코드 배열 타입 명시
let timeRecordsCount: number
// 'toggleRecording' 및 'saveIssue' 메시지 처리
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === 'toggleRecording') {
		isRecording = !isRecording
		if (isRecording) {
			timer = 0
			timeRecords = []
			timeRecordsCount = 0
			startTimer()
		} else {
			stopTimer()
			updateTabsWithTimeRecords()
		}
		return true // 비동기 응답을 위해 true 반환
	}
	//이슈 저장 시간 기록
	if (request.action === 'saveIssue' && isRecording) {
		const lastRecord = timeRecords[timeRecords.length - 1]
		if (lastRecord === undefined || request.time - lastRecord >= 1) {
			timeRecords.push(request.time) // 녹화 중 이슈 저장 시간 기록
			chrome.storage.local.set({ timeRecords: timeRecords })
			updateTabsWithTimeRecords()
		} // 모든 탭에 시간 기록 업데이트
	}
})

// ts를 모든 탭에 전송하는 함수
function updateTabsWithTimeRecords() {
	chrome.tabs.query({}, function (tabs) {
		tabs.forEach(function (tab) {
			if (tab.id !== undefined) {
				chrome.tabs.sendMessage(tab.id, {
					action: 'updateTimeRecords',
					timeRecords: timeRecords,
					timeRecordsCount: timeRecords.length,
				})
			}
		})
	})
}

// 탭 업데이트 함수
function updateTabs() {
	chrome.tabs.query({}, function (tabs) {
		tabs.forEach(function (tab) {
			if (tab.id !== undefined) {
				chrome.tabs.sendMessage(tab.id, {
					action: 'updateState',
					isRecording: isRecording,
					timer: timer,
				})
			}
		})
	})
}

// 타이머 시작 함수
function startTimer() {
	timerInterval = setInterval(() => {
		timer++
		updateTabs() // 모든 탭에 타이머 업데이트
	}, 1000)
}

// 타이머 정지 함수
function stopTimer() {
	if (timerInterval) {
		clearInterval(timerInterval)
		timerInterval = null
	}
	timer = 0
	updateTabs() // 모든 탭에 타이머 리셋
}
