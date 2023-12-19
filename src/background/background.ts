chrome.storage.local.get(['isActive'], function (result) {
	if (result.isActive === undefined) {
		chrome.storage.local.set({ isActive: false })
	}
})

// 아이콘 클릭 시 활성화/비활성화 상태 전환
chrome.action.onClicked.addListener(() => {
	chrome.storage.local.get(['isActive'], function (result) {
		const newIsActive = !result.isActive
		chrome.storage.local.set({ isActive: newIsActive })

		chrome.tabs.query({}, function (tabs) {
			tabs.forEach((tab) => {
				if (tab.id) {
					if (newIsActive) {
						chrome.scripting.executeScript({
							target: { tabId: tab.id },
							files: ['contentScript.js'],
						})
					} else {
						chrome.storage.local.set({ isActive: false })
						// chrome.tabs.sendMessage(tab.id, { extensionIsActive: false })
						//     .catch((err) => console.error(err));
					}
				}
			})
		})
	})
})

// 탭이 새로고침 또는 활성화될 때 현재 상태에 따라 콘텐츠 스크립트 삽입
function handleTabUpdate(tabId: number) {
	chrome.storage.local.get(['isActive'], function (result) {
		if (result.isActive) {
			closeBeforeTab()
			chrome.scripting.executeScript({
				target: { tabId: tabId },
				files: ['contentScript.js'],
			})
		}
	})
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (changeInfo.status === 'complete') {
		handleTabUpdate(tabId)
	}
})

chrome.tabs.onActivated.addListener((activeInfo) => {
	handleTabUpdate(activeInfo.tabId)
})

let beforeTabId: number | undefined
let isActive = false
// chrome.action.onClicked.addListener(async function clickIcon() {
// 	isActive = !isActive
// 	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
// 	if (isActive) {
// 		console.log('isActive', isActive)
// 		console.log(tabs)
// 		if (tabs.length > 0 && tabs[0].id) {
// 			beforeTabId = tabs[0].id
// 			chrome.scripting.executeScript({
// 				target: { tabId: tabs[0].id },
// 				files: ['contentScript.js'],
// 			})
// 		}
// 	}
// 	if (!isActive) {
// 		console.log('isActive false', isActive)
// 		chrome.tabs.query({}, function (tabs) {
// 			tabs.forEach(function (tab) {
// 				tab.id &&
// 					chrome.tabs
// 						.sendMessage(tab.id, { extensionIsActive: false })
// 						.catch((err) => console.error(err))
// 			})
// 		})
// 	}
// })

const closeBeforeTab = () => {
	console.log('beforeTabID', beforeTabId)
	beforeTabId &&
		chrome.tabs
			.sendMessage(beforeTabId, { isActive: false })
			.catch((err) => console.error(err))
}

const closeRecorder = () => {
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

// chrome.tabs.onUpdated.addListener(async function enterURL(tab) {
// 	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
// 	if (isActive) {
// 		console.log('isActive', isActive)
// 		console.log(tabs)
// 		if (tabs.length > 0 && tabs[0].id) {
// 			chrome.scripting.executeScript({
// 				target: { tabId: tabs[0].id },
// 				files: ['contentScript.js'],
// 			})
// 		}
// 	}
// 	if (!isActive) {
// 		console.log('isActive false', isActive)
// 		chrome.tabs.query({}, function (tabs) {
// 			tabs.forEach(function (tab) {
// 				tab.id &&
// 					chrome.tabs
// 						.sendMessage(tab.id, { extensionIsActive: false })
// 						.catch((err) => console.error(err))
// 			})
// 		})
// 	}
// })

// chrome.tabs.onCreated.addListener(async function (tab) {})

// chrome.tabs.onActivated.addListener(async function ClickTab(tab) {
// 	const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
// 	if (isActive) {
// 		// console.log('isActive', isActive)
// 		// console.log(tabs)
// 		if (tabs.length > 0 && tabs[0].id) {
// 			closeBeforeTab()
// 			console.log('currentTabId', tabs[0].id)
// 			beforeTabId = tabs[0].id
// 			chrome.scripting.executeScript({
// 				target: { tabId: tabs[0].id },
// 				files: ['contentScript.js'],
// 			})
// 		}
// 	}
// 	if (!isActive) {
// 		console.log('isActive false', isActive)
// 		chrome.tabs.query({}, function (tabs) {
// 			tabs.forEach(function (tab) {
// 				tab.id &&
// 					chrome.tabs
// 						.sendMessage(tab.id, { extensionIsActive: false })
// 						.catch((err) => console.error(err))
// 			})
// 		})
// 	}
// })

// chrome.runtime.onMessage.addListener(
// 	function cancelMeidaStream(request, sender, sendResponse) {
// 		if (request.action === 'cancel') {
// 			isActive = false
// 			console.log('cancel')
// 		}
// 	},
// )

//로그인 토큰 가져오기
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
			closeRecorder()
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
