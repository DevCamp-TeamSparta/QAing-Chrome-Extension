chrome.storage.local.get(['isActive'], function (result) {
	if (result.isActive === undefined) {
		chrome.storage.local.set({ isActive: false })
	}
})

chrome.storage.local.get(['isTooltipRecordActivated'], function (result) {
	if (result.isTooltipRecordActivated === undefined) {
		chrome.storage.local.set({ isTooltipRecordActivated: false })
	}
})

chrome.storage.local.get(['isTooltipSaveActivated'], function (result) {
	if (result.isTooltipSaveActivated === undefined) {
		chrome.storage.local.set({ isTooltipSaveActivated: false })
	}
})

// 탭이 업데이트되거나 활성화될 때 Recorder 상태를 전달하는 함수
function updateTabWithRecorderState(tabId: any) {
	chrome.storage.local.get(['isPlaying', 'timeRecords'], function (result) {
		if (tabId) {
			chrome.tabs.sendMessage(tabId, {
				action: 'updateRecorderState',
				isPlaying: result.isPlaying,
				timeRecords: result.timeRecords,
			})
		}
	})
}

interface TabUrls {
	[key: number]: string
}

const tabUrls: TabUrls = {}

// 탭이 새로고침되거나 활성화될 때 해당 함수를 호출
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (changeInfo.status === 'complete') {
		updateTabWithRecorderState(tabId)
		handleTabUpdate(tabId)
	}
	if (changeInfo.url && typeof tabId === 'number') {
		const previousUrl = tabUrls[tabId]
		tabUrls[tabId] = changeInfo.url
		if (
			previousUrl &&
			previousUrl.includes('options.html') &&
			!changeInfo.url.includes('options.html')
		) {
			// 녹화 상태 초기화
			closeRecorder()
			chrome.storage.local.set({ isActive: false })
			chrome.storage.local.set({ isPlaying: false })
			chrome.storage.local.set({ timeRecords: [] })
			isRecording = false
			stopTimer()
		}
	}
})

//새로운 탭을 열었을 때
chrome.tabs.onActivated.addListener((activeInfo) => {
	updateTabWithRecorderState(activeInfo.tabId)
	handleTabUpdate(activeInfo.tabId)
})

// 옵션페이지를 닫거나 다른 주소를 입력하는 경우 예외처리
chrome.tabs.onRemoved.addListener(function (tabId) {
	if (typeof tabId === 'number') {
		const url = tabUrls[tabId]
		if (url && url.includes('options.html')) {
			closeRecorder()
			console.log('onRemoved tabUrls', tabUrls)
			chrome.storage.local.set({ isActive: false })
			chrome.storage.local.set({ isPlaying: false })
			chrome.storage.local.set({ timeRecords: [] })
			isRecording = false
			stopTimer()
		}
		delete tabUrls[tabId]
	}
})

chrome.tabs.onCreated.addListener((tab) => {
	chrome.storage.local.get(['isActive', 'recorderPosition'], (result) => {
		if (result.isActive && tab.id) {
			chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ['contentScript.js'],
			})
		}
	})
	if (typeof tab.id === 'number' && tab.url) {
		tabUrls[tab.id] = tab.url
		console.log('onCreated tabUrls', tabUrls)
	}
})

// 아이콘 클릭 시 활성화/비활성화 상태 전환
chrome.action.onClicked.addListener(() => {
	chrome.storage.local.get(['isActive', 'isPlaying'], function (result) {
		const newIsActive = !result.isActive
		const isPlaying = result.isPlaying

		chrome.storage.local.set({ isActive: newIsActive })

		chrome.tabs.query({}, function (tabs) {
			tabs.forEach(async (tab) => {
				if (tab.id) {
					if (newIsActive) {
						chrome.scripting.executeScript({
							target: { tabId: tab.id },
							files: ['contentScript.js'],
						})
					} else {
						if (isPlaying && tab.url?.includes('options.html')) {
							// options.html을 포함하는 탭이 열려있고 녹화 중이라면 해당 탭을 닫고 녹화 전 상태로 돌림
							chrome.tabs.remove(tab.id, () => {
								if (chrome.runtime.lastError) {
									console.error(
										`Error closing tab: ${chrome.runtime.lastError.message}`,
									)
								}
							})
							console.log('onRemoved tabUrls', tabUrls)
							chrome.storage.local.set({
								isActive: false,
								isPlaying: false,
								timeRecords: [],
							})
							isRecording = false
							stopTimer()
						}
						// chrome.tabs.sendMessage(tab.id, { extensionIsActive: false })
						//     .catch((err) => console.error(err));
					}
				}
			})
		})
	})
})

function executeContentScript(tabId: number) {
	chrome.storage.local.get(['recorderPosition'], function (result) {
		if (result.recorderPosition) {
			chrome.scripting.executeScript({
				target: { tabId: tabId },
				files: ['contentScript.js'],
				// contentScript에 Recorder 위치 정보 전달
			})
		}
	})
}

// 탭이 새로고침 또는 활성화될 때 현재 상태에 따라 콘텐츠 스크립트 삽입
function handleTabUpdate(tabId: number) {
	chrome.storage.local.get(['isActive'], function (result) {
		if (result.isActive) {
			// Recorder가 이미 있는지 확인
			chrome.tabs.sendMessage(
				tabId,
				{ action: 'checkRecorder' },
				(response) => {
					if (chrome.runtime.lastError || !response?.found) {
						// Recorder가 없으면 새로 생성
						chrome.scripting.executeScript({
							target: { tabId: tabId },
							files: ['contentScript.js'],
						})
					}
				},
			)
		}
	})
}

let beforeTabId: number | undefined
let isActive = false

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
			chrome.storage.local.set({ isActive: false })
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

//익스텐션 설치시에 app.qaing.co로 이동
const frontServer = process.env.PUBLIC_FRONTEND_URL

//사용자가 확장 프로그램을 설치했을 때 홈페이지 오픈
chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason === 'install') {
		// 현재 활성화된 탭을 찾음
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			if (tabs.length > 0) {
				// 현재 탭 바로 오른쪽에 새 탭을 열도록 인덱스 설정
				var index = tabs[0].index + 1
				chrome.tabs.create({ url: frontServer, index: index })
			} else {
				// 현재 활성화된 탭이 없을 경우, 새 탭을 기본 위치에 열음
				chrome.tabs.create({ url: frontServer })
			}
		})
	}
})

// //웹페이지에서 익스텐션 호출
// function extensionCall(request: { type: string; message: any }) {
// 	if (request.type === 'extensionCall') {
// 		chrome.storage.local.get(['isActive'], function (result) {
// 			const newIsActive = !result.isActive
// 			chrome.storage.local.set({ isActive: newIsActive })

// 			// 현재 활성화된 탭만 조회
// 			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
// 				// 현재 활성화된 탭이 있다면
// 				if (tabs.length > 0 && tabs[0].id) {
// 					if (newIsActive) {
// 						// contentScript.js 실행
// 						chrome.scripting.executeScript({
// 							target: { tabId: tabs[0].id },
// 							files: ['contentScript.js'],
// 						})
// 					} else {
// 						// isActive 상태를 false로 설정
// 						chrome.storage.local.set({ isActive: false })
// 						// 메시지 전송 등의 추가 작업이 필요한 경우
// 						// chrome.tabs.sendMessage(tabs[0].id, { extensionIsActive: false })
// 						//     .catch((err) => console.error(err));
// 					}
// 				}
// 			})
// 		})
// 	}
// }

// if (!chrome.runtime.onMessage.hasListener(extensionCall)) {
// 	chrome.runtime.onMessage.addListener(extensionCall)
// }
