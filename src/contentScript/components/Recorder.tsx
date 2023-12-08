import React from 'react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useInterval } from '../hooks/useInterval'

function Recorder() {
	const [recording, setRecording] = useState(false)
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
	const [recordedChunks, setRecordedChunks] = useState<Blob>()
	const [videoURL, setVideoURL] = useState<string | null>(null)
	//토큰
	const [accessToken, setAccessToken] = useState(null)


	//계속 진행되는 타이머
	const [time, setTime] = useState<number>(0)
	const [isRunning, setIsRunning] = useState<boolean>(false)
	const [timeRecords, setTimeRecords] = useState<number[]>([])
	//15분 마다 리셋되는 타이머
	const [TimerBeingReset, setTimerBeingReset] = useState<number>(0)
	const [isRunningTimerBeingReset, setIsRunningTimerBeingReset] =
		useState<boolean>(false)


	//화면녹화 버튼을 감지해서 녹화를 실행하는 코드
	useEffect(() => {
		if (recording) {
			// 미디어 스트림 획득
			navigator.mediaDevices
				.getDisplayMedia({ video: true })
				.then((stream: MediaStream) => {
					handleStartStop()
					resetTimerhandleStartStop()
					// setMediaStream(stream)
					const recorder = new MediaRecorder(stream)
					setMediaRecorder(recorder)

					const chunks: Blob[] = []
					recorder.ondataavailable = (e) => {
						if (e.data.size > 0) {
							chunks.push(e.data)
							const blob = new Blob(chunks, { type: 'video/webm' }) // Blob 객체 생성
							setRecordedChunks(blob)
							// onSubmitVideo(blob, timeArray)
							chunks.pop()
							console.log('chunks', chunks)
						}
					}

					recorder.start(20000)

					// 5분 후에 녹화 중지
					const timeoutId = setTimeout(
						() => {
							recorder.stop()
							if (mediaStream) {
								mediaStream.getTracks().forEach((track) => track.stop())
							}
						},
						60 * 1000 + 2,
					) // 5분

					return () => clearTimeout(timeoutId) // 컴포넌트 unmount 시 타이머 해제
				})
				.catch((error) => {
					console.error('Error accessing media devices:', error)
				})
		} else {
			// 녹화 중지
			if (mediaRecorder) {
				mediaRecorder.stop()
			}
			if (mediaStream) {
				mediaStream.getTracks().forEach((track) => track.stop())
			}
		}
		// console.log('recordedChunks', recordedChunks)
	}, [recording])


	useEffect(() => {
		if (recordedChunks) {
			onSubmitVideo(recordedChunks, timeRecords)
		}
	}, [recordedChunks])

	//녹화 시작 정지 버튼핸들러
	const handleStartStopClick = () => {
		setRecording((prevRecording) => !prevRecording)

		if (recording) {
			setIsRunning((prevIsRunning) => !prevIsRunning)
			setIsRunningTimerBeingReset((prevIsRunning) => !prevIsRunning)
			setTime(0)
			setTimerBeingReset(0)
		}
	}


	const onSubmitVideo = async (blob: Blob, timeRecords: number[]) => {
		if (blob) {
			// const blob = new Blob(recordedChunks, { type: 'video/webm' })
			const formData = new FormData()
			formData.append('webmFile', blob)
			formData.append('timestamps', JSON.stringify(timeRecords))
			console.log('timeRecords', timeRecords)
			console.log('전송시작')

			await axios
				.post(`https://test.qaing.co/videos/process`, formData)
				.then((response) => {
					// 서버로부터의 응답 처리
					console.log(response.data)
				})
				.catch((error) => {
					// 에러 처리
					console.error('오류발생', error)
				})
		}
	}

	// const handleDownloadClick = () => {
	// 	// 녹화된 비디오 다운로드

	// 	if (recordedChunks.length > 0) {
	// 		const blob = new Blob(recordedChunks, { type: 'video/webm' })
	// 		console.log('전송시작')
	// 		const url = URL.createObjectURL(blob)
	// 		const a = document.createElement('a')
	// 		a.href = url
	// 		a.download = 'recorded-screen.webm'
	// 		document.body.appendChild(a)
	// 		a.click()
	// 		URL.revokeObjectURL(url)
	// 		document.body.removeChild(a)
	// 		console.log('a')
	// 	}
	// }

	useEffect(() => {
		console.log('timeRecords', timeRecords)
	}, [timeRecords])

	//타이머에서 계속 시간이 증가하도록 하는 코드
	useInterval(
		() => {
			setTime((prevTime) => prevTime + 1)
		},
		isRunning ? 1000 : null,
	)

	//15분마다 초기화 되게 할 타이머
	useInterval(
		() => {
			setTimerBeingReset((prevTime) => prevTime + 1)
		},
		isRunningTimerBeingReset ? 1000 : null,
	)

	const handleStartStop = () => {
		setIsRunning((prevIsRunning) => !prevIsRunning)
	}

	const resetTimerhandleStartStop = () => {
		setIsRunningTimerBeingReset((prevIsRunning) => !prevIsRunning)
	}

	const handleRecordTime = () => {
		setTimeRecords((prevRecords) => [...prevRecords, time])
	}

	const handleReset = () => {
		setTime(0)
		setTimeRecords([])
	}

	//녹화된 비디오 다운로드 버튼 핸들러
	const handleDownloadClick = () => {
		// 녹화된 비디오 다운로드
		if (recordedChunks.length > 0) {
			const blob = new Blob(recordedChunks, { type: 'video/webm' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'recorded-screen.webm'
			document.body.appendChild(a)
			a.click()
			URL.revokeObjectURL(url)
			// document.body.removeChild(a)
			console.log('a', a)
		}
	}

	//크롬 익스텐션이 실행 됬을 때 토큰 background.js를 이용해 chrome.cookie에서 토큰을 가져온다.
	useEffect(() => {
		// alert('익스텐션 시작')
		const currentUrl = window.location.origin
		console.log('currentUrl', currentUrl)
		console.log('currentUrl', currentUrl === 'https://app.qaing.co')

		chrome.runtime?.sendMessage({ action: 'getToken' }, (response) => {
			if (response.accessToken) {
				setAccessToken(response.accessToken)
				alert('로그인이 되었습니다.')
			} else {
				// alert('로그인이 필요합니다.')
				if (
					currentUrl === 'https://app.qaing.co' ||
					currentUrl === 'http://localhost:3000' ||
					currentUrl === 'https://accounts.google.com' ||
					currentUrl === 'https://test.qaing.co'
				) {
					return
				}
				window.location.href = 'https://app.qaing.co/auth/signup'
			}
		})
	}, [])

	useEffect(() => {
		console.log('accessToken', accessToken)
	}, [accessToken])


	return (
		<section className="fixed left-4 bottom-10 w-[247px] h-[240px] bg-white z-50">
			<h1>Screen Recorder</h1>
			<div className="flex flex-row ">
				<div className="flex flex-row w-[246px] h-[80px] bg-[#585858] rounded-full">
					<div className="w-[64px] h-[64px] bg-white rounded-full flex flex-row items-center justify-center m-2">
						<div className="flex flex-row items-center justify-center ">
							<button
								className="bg-[#E95050] w-[24px] h-[24px] m-auto rounded-sm"
								onClick={handleStartStopClick}
							>
								{recording ? '정지' : ''}
							</button>
						</div>
					</div>
					<div className="flex flex-row items-center justify-center">
						<div className="bg-white rounded-full w-[155.4px] h-[63.5px]">
							<div className="flex flex-row items-center justify-evenly h-full">
								{/* <img
              src='icon.png'
              alt='save'
              // className=' w-[20px] h-[27.5px]'
            /> */}
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
								{/* <button onClick={handleStartStop}>
									{isRunning ? 'Stop' : 'Start'}
								</button>
								<button onClick={handleRecordTime}>타임 기록</button>
								<button onClick={handleReset}>리셋</button> */}
								<p>{`${Math.floor(time / 60)
									.toString()
									.padStart(2, '0')}:${(time % 60)
									.toString()
									.padStart(2, '0')}`}</p>
							</div>
						</div>
					</div>
				</div>

				{videoURL && (
					<>
						<video controls src={videoURL} width="400"></video>
						<br />
						<button
							type="submit"
							className="w-[400px] h-[100px] bg-white"
							// onClick={handleDownloadClick}
						>
							전송하기
						</button>
					</>
				)}
			</div>
		</section>
	)
}

export default Recorder
