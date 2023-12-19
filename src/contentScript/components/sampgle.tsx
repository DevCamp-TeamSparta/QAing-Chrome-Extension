import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useInterval } from '../hooks/useInterval'

interface ChromeMessage {
	action: string
}

function Recorder() {
	const [recording, setRecording] = useState(false) // 녹화 중인지 여부
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null) // 미디어 스트림
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null) // 미디어 레코더 객체
	const [recordedChunks, setRecordedChunks] = useState<Blob>() // 녹화된 청크들
	const [videoURL, setVideoURL] = useState<string | null>(null) // 생성된 비디오 URL
	const [accessToken, setAccessToken] = useState(null) // 액세스 토큰
	const [time, setTime] = useState<number>(0) // 타이머 시간
	const [isRunning, setIsRunning] = useState<boolean>(false) // 타이머가 실행 중인지 여부
	const [timeRecords, setTimeRecords] = useState<number[]>([]) // 기록된 timecode들
	const [timeRecordsCount, setTimeRecordsCount] = useState<number>(0)
	const [folderId, setFolderId] = useState<string>('') // 폴더 ID
	const baseUrl = process.env.PUBLIC_BACKEND_API_URL // 백엔드 API URL
	const recordTimeout = useRef<NodeJS.Timeout | null>(null)
	const [isActive, setIsActive] = useState<boolean>(false) // 활성화 여부

	// bg에서 비활성화, 활성화 상태 확인
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.action === 'enable') {
			setIsActive(true)
			initializeContentScript()
		} else if (message.action === 'disable') {
			setIsActive(false)
			cleanupContentScript()
		}
	})

	// 활성화 함수
	const initializeContentScript = () => {
		setRecording(false)
		setMediaStream(null)
		setRecording(false)
		setIsRunning(false)
		setTime(0)
		setTimeRecords([])

		const recorderUI = document.getElementById('recorderSection')
		if (recorderUI) recorderUI.style.display = 'block'
	}

	// 비활성화 함수
	const cleanupContentScript = () => {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop())
		}
		setRecording(false)
		setIsRunning(false)
		setTime(0)
		setTimeRecords([])
		const recorderUI = document.getElementById('recorderSection')
		if (recorderUI) recorderUI.style.display = 'none'
	}

	// 녹화 시작 정지 버튼핸들러
	const handleStartStopClick = () => {
		// // 다른 페이지에서 녹화버튼을 눌렀을 경우 우리 페이지로 보내기
		// const currentUrl = window.location.href;

		// chrome.runtime.sendMessage({ action: "toggleRecording" }, response => {
		// 	if (!response.loggedIn) {
		// 		alert('로그인이 필요해요! 🙌');
		// 		window.open('https://app.qaing.co/auth/signup', '_blank');
		// 	} else if (!currentUrl.includes("app.qaing.co") && !response.isRecording) {
		// 		alert("QAing 페이지에서 녹화할 수 있어요! 🙌");
		// 		window.open('https://app.qaing.co', '_blank');
		// 	} else if (!currentUrl.includes("app.qaing.co") && response.isRecording) {
		// 		stopRecording()
		// 	}
		// });

		//아래는 모든 페이지에서 녹화 시작이 가능한 버전
		chrome.runtime.sendMessage({ action: 'toggleRecording' }, (response) => {
			if (response && !response.loggedIn) {
				alert('로그인이 필요해요! 🙌')
				window.open('https://app.qaing.co/auth/signup', '_blank')
			}
		}) // background 녹화 상태 토글 메시지 전송
	}

	// bg에서 녹화상태, ts를 받는 리스너
	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			if (request.action === 'updateState') {
				// 녹화 상태, 타이머 업데이트
				setTime(request.timer)
				setIsRunning(request.isRecording)
				setRecording(request.isRecording)
				// if (request.isRecording) {
				// 	//녹화가 시작된 상태
				// } else {
				// 	// 녹화가 중지된 상태
				// }
			} else if (request.action === 'updateTimeRecords') {
				setTimeRecords(request.timeRecords)
				setTimeRecordsCount(request.timeRecordsCount)
			}
		},
	)

	useEffect(() => {
		const receiveTimeRecords = (request: any) => {
			if (request.action === 'updateState') {
				setTime(request.timer)
			}
		}
		chrome.runtime.onMessage.addListener(receiveTimeRecords)
		return () => {
			chrome.runtime.onMessage.addListener(receiveTimeRecords)
		}
	}, [])

	// 녹화 상태 확인 후 녹화 시작, 중단하는 useEffect
	useEffect(() => {
		if (recording) {
			startRecording()
			const timer = setTimeout(() => {
				stopRecording()
			}, 3600000) // 1시간 후에 녹화 중단
			return () => clearTimeout(timer)
		} else {
			stopRecording()
		}
	}, [recording])

	useEffect(() => {
		async function fetchAndSubmit() {
			if (recordedChunks && !folderId) {
				try {
					const data = await onSubmitGetId()
					setFolderId(data.folderId)
					if (data.folderId && timeRecords.length > 0) {
						onSubmitVideo(recordedChunks, timeRecords, data.folderId)
						window.open(
							`https://app.qaing.co/folder/${data.folderId}/issues`,
							'_blank',
						)
					}
				} catch (error) {
					console.error('녹화 종료 및 비디오 제출 과정 중 에러 발생:', error)
				}
			}
		}

		fetchAndSubmit()
	}, [recordedChunks, timeRecords, folderId])

	// 녹화 종료 시 folder id 생성하는 함수
	const onSubmitGetId = async () => {
		console.log('folder id 가져오기 시작')
		try {
			const response = await axios.get(`${baseUrl}/videos/process`, {
				withCredentials: true,
			})
			console.log('folder id 가져오기 응답성공', response.data)
			return response.data // 데이터를 반환합니다.
		} catch (error) {
			console.error('folder ID 가져오기 실패: ', error)
			throw error // 에러를 throw 하여 상위 catch 블록에서 잡을 수 있게 합니다.
		}
	}

	// 녹화 시작 함수
	const startRecording = (): void => {
		// 이전에 활성화된 미디어 스트림이 있는 경우 정리
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop())
		}
		navigator.mediaDevices
			.getDisplayMedia({ video: true })
			.then((stream) => {
				const recorder = new MediaRecorder(stream)

				if (recorder.state === 'inactive') {
					setMediaRecorder(recorder) // 상태 설정
					const chunks: Blob[] = []

					recorder.ondataavailable = (e) => {
						if (e.data.size > 0) {
							chunks.push(e.data)
							setRecordedChunks(new Blob([e.data], { type: 'video/webm' }))
							console.log('chunks', chunks)
						}
					}

					recorder.onstop = () => {
						const blob = new Blob(chunks, { type: 'video/webm' })
						const url = URL.createObjectURL(blob)
						setVideoURL(url)
						console.log('url', url)
					}

					recorder.start() // 녹화 시작
					setMediaStream(stream) // 스트림 저장
				}
			})
			.catch((error) => {
				console.log('녹화 시작 중 오류 발생', error)
			})
	}

	// 녹화 시작 함수
	// const startRecording = ():void => {
	// 	// 이전 미디어 스트림 정리
	// 	if (mediaStream) {
	// 		mediaStream.getTracks().forEach(track => track.stop())
	// 	}
	// 	//미디어 레코딩 시작
	// 	navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
	// 		// 새로운 미디어 레코더 인스턴스 생성
	// 		const recorder = new MediaRecorder(stream)
	// 		setMediaRecorder(recorder)
	// 		// 미디어 스트림이 활성화되어 있고, 미디어 레코더가 inactive 상태인 경우
	// 		if (!mediaRecorder || mediaRecorder.state === 'inactive') {
	// 			const chunks: Blob[] = []
	// 			recorder.ondataavailable = (e) => {
	// 				if (e.data.size > 0) {
	// 					chunks.push(e.data)
	// 					setRecordedChunks(new Blob([e.data], { type: 'video/webm' }))
	// 					console.log('chunks', chunks)
	// 				}
	// 			}

	// 			recorder.onstop = () => {
	// 				const blob = new Blob(chunks, { type: 'video/webm' })
	// 				const url = URL.createObjectURL(blob)
	// 				setVideoURL(url)
	// 				console.log('url', url)
	// 			}

	// 			recorder.start()
	// 			setMediaStream(stream)
	// 		}
	// 	}).catch((error) => {
	// 		console.log('녹화 시작 중 오류 발생', error)
	// 		// 녹화 중단 및 상태 리셋
	// 		if (mediaRecorder && mediaRecorder.state === 'recording') {
	// 			mediaRecorder.stop();
	// 		}
	// 		setMediaRecorder(null);
	// 		if (mediaStream) {
	// 				mediaStream.getTracks().forEach((track) => track.stop());
	// 			  }
	// 			  setMediaStream(null);
	// 			  setRecordedChunks(undefined);
	// 			  setVideoURL(null);

	// 	})
	// }

	// 녹화 중단 함수
	const stopRecording = async () => {
		if (mediaRecorder && mediaRecorder.state === 'recording') {
			mediaRecorder.stop()
			setMediaRecorder(null)
			if (mediaStream) {
				mediaStream.getTracks().forEach((track) => track.stop())
			}

			// 시간 기록이 없는 경우 경고하고 함수 종료
			if (timeRecords.length === 0) {
				alert(
					'저장된 이슈가 없어 이슈 파일이 만들어지지 않았어요! 홈으로 이동할게요! 🙌',
				)
				window.open(`https://app.qaing.co/home`, '_blank')
				return
			}

			//await onSubmitGetId()
			// if (recordedChunks) {
			// 	console.log('onSubmitVideo 직전', timeRecords)
			// 	await onSubmitVideo(recordedChunks, timeRecords, folderId)
			// }

			// try {
			// 	console.log('onSubmitGetId 호출 전', recordedChunks)
			// 	const folderResponse = await onSubmitGetId();
			// 	const folderId = folderResponse.data.folderId; // 응답으로부터 folderId 추출
			// 	console.log('folder id 받아온 이후', folderId)
			// 	console.log('folder id 받아온 이후', recordedChunks)
			// 	console.log('folder id 받아온 이후', timeRecords)
			// 	if (recordedChunks && folderId) {
			// 		console.log('onSubmitVideo 직전', timeRecords);
			// 		await onSubmitVideo(recordedChunks, timeRecords, folderId);
			// 		window.open(`https://test.app.qaing.co/folder/${folderId}/issues`, '_blank');
			// 	}
			// } catch (error) {
			// 	console.error('녹화 종료 중 에러 발생:', error);
			// 	// 에러 처리 로직
			// }

			// 상태 초기화 및 페이지 이동
			setRecording(false)
			setIsRunning(false)
			setTime(0)
			setTimeRecords([])
			setTimeRecordsCount(0)
		}
	}

	// 녹화 종료 시 folder id 생성하는 함수
	// const onSubmitGetId = async () => {
	// 	console.log('folder id 가져오기 시작')
	// 	// const response = await axios.get(`${baseUrl}/videos/process`, {
	// 	// 	withCredentials: true,
	// 	// });
	// 	// console.log('folder id 가져오기 응답성공', response.data);
	// 	// return response; // 여기서 응답 객체 전체를 반환
	// 	try {
	// 		const response = await axios.get(`${baseUrl}/videos/process`, {
	// 			withCredentials: true,
	// 		})
	// 		console.log('folder id 가져오기 응답성공', response.data)
	// 		const usersFolderId = response.data.folderId
	// 		setFolderId(usersFolderId)
	// 	} catch (error) {
	// 		console.log('folder ID 가져오기 실패: ', error)
	// 		alert('영상 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
	// 		window.location.href = `https://test.app.qaing.co/home`
	// 	}
	// }

	// 녹화한 영상과 ts를 전송하는 코드
	const onSubmitVideo = async (
		blob: Blob,
		timeRecords: number[],
		usersFolderId: string,
	) => {
		console.log('onSubmitVideo 호출', { blob, timeRecords, usersFolderId })
		if (!blob) {
			console.log('전송할 녹화 데이터가 없어요')
			return
		}

		const formData = new FormData()
		formData.append('webmFile', blob)
		formData.append('timestamps', JSON.stringify(timeRecords))
		console.log('formData: ', formData.entries())
		console.log('전송한 timeRecords', timeRecords)
		console.log('전송시작')

		try {
			const response = await axios.put(
				`${baseUrl}/videos/process/${usersFolderId}`,
				formData,
				{
					withCredentials: true,
				},
			)
			console.log('서버로부터의 응답', response.data)
		} catch (error) {
			console.log('영상 전송 중 오류 발생', error)
		}
	}

	useEffect(() => {
		console.log('timeRecords', timeRecords)
	}, [timeRecords])

	//타이머에서 계속 시간이 증가하도록 하는 코드
	useInterval(
		() => {
			if (time >= 3600) {
				stopRecording()
			} else {
				setTime(time + 1)
			}
		},
		isRunning ? 1000 : null,
	)

	const handleRecordTime = () => {
		const roundedTime = Math.floor(time)
		chrome.runtime.sendMessage({ action: 'saveIssue', time: roundedTime })
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

	return (
		<section
			id="recorderSection"
			className="fixed left-4 bottom-10 w-[340px] h-[240px] z-50"
		>
			<div className="flex flex-row ">
				<div className="flex flex-row w-[340px] h-[80px] bg-[#585858] rounded-full">
					<div className="w-[170px] h-[64px] bg-white rounded-full flex flex-row items-center justify-center m-2">
						<div className="flex flex-row items-center justify-center ">
							{recording ? (
								<button
									className="bg-[#E95050] w-[24px] h-[24px] m-auto rounded-sm"
									onClick={handleStartStopClick}
								></button>
							) : (
								//QA 시작 버튼 !recording
								<button
									className="bg-[#4CAF50] w-[24px] h-[24px] m-auto rounded-sm"
									onClick={handleStartStopClick}
								>
									QA 시작
								</button>
							)}
							{/*타이머 when recording*/}
							{recording && (
								<p>{`${Math.floor(time / 60)
									.toString()
									.padStart(2, '0')}:${(time % 60)
									.toString()
									.padStart(2, '0')}`}</p>
							)}
						</div>
					</div>
					<div className="flex flex-row items-center justify-center">
						<div className="bg-white rounded-full w-[170px] h-[64px]">
							<div className="flex flex-row items-center justify-evenly h-full">
								<svg
									width="19.4"
									height="27.5"
									viewBox="0 0 19.4 27.5"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M0 4.01821C0 2.95252 0.38324 1.93047 1.06541 1.17691C1.74758 0.423346 2.6728 0 3.63754 0H15.7627C16.7274 0 17.6526 0.423346 18.3348 1.17691C19.017 1.93047 19.4002 2.95252 19.4002 4.01821V25.4862C19.4002 27.1203 17.7269 28.0712 16.5241 27.1216L9.7001 21.7372L2.87608 27.1216C1.67206 28.0726 0 27.1216 0 25.4875V4.01821Z"
										fill="#585858"
									/>
								</svg>

								<div className="font-semibold text-xl">
									<button onClick={handleRecordTime}>이슈저장</button>
								</div>
								{/*아슈 개수 표시*/}
								{recording && timeRecordsCount > 0 && (
									<div className="font-semibold text-xl">
										<p>{timeRecordsCount}</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

export default Recorder
