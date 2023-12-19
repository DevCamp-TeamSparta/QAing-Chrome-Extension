import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import React from 'react'
import StartButton from '../atoms/RecorderStartButtonAtoms/index'
import StopButton from '../atoms/RecorderStopButtonAtoms'

function Recorder() {
	const [recording, setRecording] = useState(false)
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
	const [recordedChunks, setRecordedChunks] = useState<Blob>()
	const [videoURL, setVideoURL] = useState<string | null>(null)
	//토큰
	const [accessToken, setAccessToken] = useState(null)

	//타이머
	const [time, setTime] = useState<number>(0)
	const [isRunning, setIsRunning] = useState<boolean>(false)
	const [timeRecordsCount, setTimeRecordsCount] = useState<number>(0)
	const [timeRecords, setTimeRecords] = useState<number[]>([])
	const THROTTLE_TIME = 1000

	//유적 FolderID
	const [folderId, setFolderId] = useState<string>('')

	//익스텐션 Acitve && inAcitvie
	const [extensionIsActive, setExtensionIsActive] = useState<boolean>(true)

	//환경 변수
	const frontServer = process.env.PUBLIC_FONTEND_URL

	const stopRecording = () => {
		if (mediaRecorder) {
			mediaRecorder.stop()
			if (mediaStream) {
				mediaStream.getTracks().forEach((track) => track.stop())
				setRecording(false)
				setIsRunning(false)
				setTime(0)
			}
			setRecording(false)
			setIsRunning(false)
			setTime(0)
		}
	}

	useEffect(() => {
		if (recordedChunks) {
			// onSubmitVideo(recordedChunks, timeRecords)
			onSubmitGetId()
		}
	}, [recordedChunks])

	useEffect(() => {
		console.log('folderId', folderId)
		const usersFolderId = folderId
		if (folderId === '') return
		if (!recordedChunks) return
		onSubmitVideo(recordedChunks, timeRecords, usersFolderId)
		window.location.href = `${frontServer}/folder/${usersFolderId}/issues`
	}, [folderId])

	//녹화 시작 정지 버튼핸들러
	const handleStartStopClick = () => {
		setRecording((prevRecording) => !prevRecording)
		if (recording) {
			handleStartStop()
			setTime(0)
		}
		if (!recording) {
			setTime(0)
			setTimeRecords([])
		}
	}

	const onSubmitVideo = async (
		blob: Blob,
		timeRecords: number[],
		usersFolderId: string,
	) => {
		if (blob) {
			// const blob = new Blob(recordedChunks, { type: 'video/webm' })
			const formData = new FormData()
			formData.append('webmFile', blob)
			formData.append('timestamps', JSON.stringify(timeRecords))
			console.log('timeRecords', timeRecords)
			console.log('전송시작')

			await axios
				.put(`${frontServer}/videos/process/${usersFolderId}`, formData, {
					withCredentials: true,
				})
				.then((response) => {
					// // 서버로부터의 응답 처리
					console.log(response.data)
					// const UsersfolderId = response.data
					// setFolderId(UsersfolderId)
				})
				.catch((error) => {
					// 에러 처리
					console.error('오류발생', error)
				})
		}
	}

	const onSubmitGetId = async () => {
		console.log('id가져오기 시작')
		await axios
			.get(`${frontServer}/videos/process`, {
				withCredentials: true,
			})
			.then((response) => {
				// 서버로부터의 응답 처리
				console.log('응답성공', response.data)
				const UsersfolderId = response.data.folderId
				setFolderId(UsersfolderId)
			})
			.catch((error) => {
				'몽고db id를 가져오지 못했습니다.'
			})
	}

	useEffect(() => {
		console.log('timeRecords', timeRecords)
	}, [timeRecords])

	// background에서 타이머와 타임기록을 받아오는 코드
	useEffect(() => {
		const receiveTimeRecords = (request: any) => {
			if (request.action === 'updateState') {
				setTime(request.timer)
				setIsRunning(request.isRecording)
			}
			if (request.action === 'updateTimeRecords') {
				setTimeRecords(request.timeRecords)
				setTimeRecordsCount(request.timeRecordsCount)
			}
		}
		chrome.runtime.onMessage.addListener(receiveTimeRecords)
		return () => {
			chrome.runtime.onMessage.addListener(receiveTimeRecords)
		}
	}, [])

	const handleRecordTime = () => {
		const roundedTime = Math.floor(time)
		chrome.runtime.sendMessage({ action: 'saveIssue', time: roundedTime })
	}

	useEffect(() => {
		const getIsActiveMessage = (request: any) => {
			if (request.extensionIsActive !== undefined) {
				console.log(request.extectionIsActive)
				setExtensionIsActive(request.extensionIsActive)
				console.log('extensionIsActive 수신완료')
				// console.log('deacive')
				// chrome.runtime.sendMessage({ command: 'deActive' })
			}
		}
		chrome.runtime.onMessage.addListener(getIsActiveMessage)

		return () => {
			chrome.runtime.onMessage.removeListener(getIsActiveMessage)
		}
	}, [])

	// extensionIsActive 확인
	useEffect(() => {
		console.log('extensionIsActive', extensionIsActive)
	}, [extensionIsActive])

	const startTimer = () => {
		chrome.runtime.sendMessage({ action: 'toggleRecording' })

		// background 녹화 상태 토글 메시지 전송
	}

	const stopTimer = () => {
		// background 타이머 상태 토글 메시지 전송
		chrome.runtime.sendMessage({ action: 'toggleRecording' })
		setTime(0)
	}

	const handleStartStop = () => {
		setIsRunning((prevIsRunning) => !prevIsRunning)
	}

	const isLogin = () => {
		const currentUrl = window.location.origin
		console.log('currentUrl', currentUrl)

		chrome.runtime?.sendMessage({ action: 'getToken' }, (response) => {
			if (response.accessToken) {
				setAccessToken(response.accessToken)
				moveOptionPage()
			}
			if (!response.accessToken) {
				alert('로그인이 필요해요 🙌')

				window.open(`${frontServer}/auth/signup`, '_blank')
			}
		})
	}

	//재생 정지버튼 고체 버튼  + 시작 버튼
	const [isPlaying, setIsPlaying] = useState<boolean>(false)
	const startRecordingState = () => {
		chrome.storage.local.set({ isPlaying: true })
		setIsPlaying(true)
		console.log(isPlaying, 'startbutton')
	}

	//녹화정지를 contentScript에서 background를 통해 options로 전달하는 코드
	const stopRecordingState = () => {
		if (isPlaying && timeRecords.length === 0) {
			alert(
				'저장된 이슈가 없어 이슈 파일이 만들어지지 않았어요! 홈으로 이동할게요! 🙌 ',
			)
			chrome.storage.local.set({ isActive: false })
			window.open(`${frontServer}`, '_blank')
		}

		chrome.storage.local.set({ isPlaying: false })
		setIsPlaying(false)
		console.log(isPlaying, 'stoptbutton')
		stopTimer()
		chrome.storage.local.set({ isActive: false })
		chrome.runtime.sendMessage({ action: 'stopRecordingToBackgournd' })

		//이슈저장 카운트 리셋
		chrome.storage.local.remove('timeRecords', function () {
			console.log('timeRecords가 삭제되었습니다.')
		})
		setTimeRecordsCount(0)

		// setRecording((prev) => !prev)
		try {
			stopRecording()
		} catch (error) {
			console.error('stopRecording 함수에서 오류가 발생했습니다:', error)
		}
	}

	useEffect(() => {
		chrome.storage.local.get('isPlaying', function (data) {
			console.log(data.isPlaying) // "value"
			setIsPlaying(data.isPlaying)
		})
		chrome.storage.local.get('timeRecords', function (data) {
			console.log(data.timeRecords)
			const RecordsCount = data.timeRecords.length
			setTimeRecordsCount(RecordsCount)
			setTimeRecords(data.timeRecords)
		})
	}, [])

	// 녹화 버튼을 누르면 option페이지로 이동시는 코드
	const moveOptionPage = () => {
		startRecordingState()
		chrome.runtime.sendMessage({ action: 'createAndMoveTab' })
		// startTimer()
	}

	useEffect(() => {
		console.log('accessToken', accessToken)
	}, [accessToken])

	// 🙌 단축키
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			// (Ctrl 또는 Command) + Shift + G
			if (
				(event.ctrlKey || event.metaKey) &&
				event.shiftKey &&
				event.key === 'g'
			) {
				// 첫 번째 버튼의 기능 (녹화 시작/종료)
				event.preventDefault()
				handleStartStopClick()
			}
			// (Ctrl 또는 Command) + Shift + B
			else if (
				(event.ctrlKey || event.metaKey) &&
				event.shiftKey &&
				event.key === 'b'
			) {
				// 두 번째 버튼의 기능 (이슈 저장)
				event.preventDefault()
				handleRecordTime()
			}
		}

		// 키보드 이벤트 리스너 등록
		window.addEventListener('keydown', handleKeyPress)

		// 컴포넌트가 언마운트될 때 이벤트 리스너 제거
		return () => {
			window.removeEventListener('keydown', handleKeyPress)
		}
	}, [handleStartStopClick, handleRecordTime])

	useEffect(() => {
		console.log('timeRecordsCount', timeRecordsCount)
	}, [])

	return extensionIsActive === true ? (
		<section className="fixed left-[50px] bottom-[70px] z-900 ">
			{/* <h1>Screen Recorder</h1> */}
			<div className="inline-block ">
				<div className="flex flex-row h-[68px]  bg-[#3C3C3C]  px-2 py-2  rounded-full">
					<div className="   rounded-full flex flex-row items-center px-2 py-2  ">
						{isPlaying ? (
							<button
								className="  rounded-[99px] flex flex-row items-center  px-2 py-2 hover:bg-[#5F6060]"
								onClick={stopRecordingState}
							>
								<div className="flex flex-row  ">
									<StopButton />
									<p className="b2 mx-2 my-[6px] text-white w-[70px]">
										{`00:${Math.floor(time / 60)
											.toString()
											.padStart(2, '0')}:${(time % 60)
											.toString()
											.padStart(2, '0')}`}
									</p>
								</div>
							</button>
						) : (
							<button
								className="   rounded-[99px] flex flex-row items-center px-2 py-2 hover:bg-[#5F6060] "
								onClick={isLogin}
							>
								<div className="flex flex-row  ">
									<StartButton />
									<p className="b2 ml-2 my-[6px] text-white">QA 시작</p>
								</div>
							</button>
						)}
					</div>
					{/* 가운데 막대바 */}
					<div className="h-[28px] border border-gray-700 ml-2 my-auto "></div>
					<div className="px-2 py-2 flex flex-row items-center">
						{isPlaying ? (
							<button
								className="rounded-[99px] h-[52px] flex flex-row items-center px-2 py-2 pr-2 hover:bg-[#5F6060] "
								onClick={handleRecordTime}
							>
								<div className="flex flex-row items-center   ">
									<div className="ml-2">
										<svg
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M4 2.42471C4 1.63786 4.59695 1 5.33333 1H18.6667C19.403 1 20 1.63786 20 2.42471V21.5725C20 22.8018 18.6407 23.4541 17.7808 22.6373L12.8858 17.988C12.3806 17.5082 11.6194 17.5082 11.1142 17.988L6.21915 22.6373C5.35928 23.4541 4 22.8018 4 21.5725V2.42471Z"
												fill="white"
											/>
										</svg>
									</div>

									<p className="b2 mx-2 my-[6px] text-white">이슈 저장</p>
									{timeRecordsCount > 0 && (
										<div
											className={`bg-white flex flex-row items-center justify-center rounded-full h-[28px] ml-2 ${
												timeRecordsCount < 10 ? 'min-w-[28px]' : 'min-w-[38px]'
											}`}
										>
											<div className="mt-[2px] flex flex-row items-center b2">
												<p> {timeRecordsCount}</p>
											</div>
										</div>
									)}
								</div>
							</button>
						) : (
							<div
								className="rounded-[99px] h-[52px] flex flex-row items-center  px-2 py-2  "
								onClick={handleRecordTime}
							>
								<div className="flex flex-row items-center  ">
									<div>
										<svg
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M4 2.42471C4 1.63786 4.59695 1 5.33333 1H18.6667C19.403 1 20 1.63786 20 2.42471V21.5725C20 22.8018 18.6407 23.4541 17.7808 22.6373L12.8858 17.988C12.3806 17.5082 11.6194 17.5082 11.1142 17.988L6.21915 22.6373C5.35928 23.4541 4 22.8018 4 21.5725V2.42471Z"
												fill="white"
											/>
										</svg>
									</div>

									<p className="b2 ml-2 my-[6px] text-white">이슈 저장</p>
								</div>
							</div>
						)}
					</div>
				</div>
				<div className=" "></div>
			</div>
		</section>
	) : (
		<div></div>
	)
}

export default Recorder
