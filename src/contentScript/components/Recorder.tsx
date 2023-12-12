import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useInterval } from '../hooks/useInterval'
import React from 'react'

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
	const [timeRecords, setTimeRecords] = useState<number[]>([])
	const THROTTLE_TIME = 1000

	//유적 FolderID
	const [folderId, setFolderId] = useState<string>('')

	const baseUrl = process.env.PUBLIC_BACKEND_API_URL

	const recordTimeout = useRef<NodeJS.Timeout | null>(null)

	//화면녹화 버튼을 감지해서 녹화를 실행하는 코드
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

	const startRecording = () => {
		navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
			const recorder = new MediaRecorder(stream)
			setMediaRecorder(recorder)
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

			recorder.start()
			handleStartStop()

			setMediaStream(stream)
		})
	}

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
		window.location.href = `https://app.qaing.co/folder/${usersFolderId}/issues`
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
				.put(`${baseUrl}/videos/process/${usersFolderId}`, formData, {
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
		console.log('id가져오기 시작ㄴ')
		await axios
			.get(`${baseUrl}/videos/process`, {
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

	const handleDownloadClick = (blob: Blob) => {
		// 녹화된 비디오 다운로드
		if (recordedChunks) {
			console.log('비디오 다운로드 준비완료')
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'recorded-screen.webm'
			document.body.appendChild(a)
			a.click()
			URL.revokeObjectURL(url)
			document.body.removeChild(a)
			console.log('다운 가자!')
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

	const handleStartStop = () => {
		setIsRunning((prevIsRunning) => !prevIsRunning)
	}

	const handleRecordTime = () => {
		setTimeRecords((prevRecords) => {
			const lastRecord = prevRecords[prevRecords.length - 1]
			if (lastRecord !== time) {
				return [...prevRecords, time]
			}
			return prevRecords
		})
		recordTimeout.current = setTimeout(() => {
			recordTimeout.current = null
			//setTimeRecords([])
		}, THROTTLE_TIME)
	}

	const isLogin = () => {
		const currentUrl = window.location.origin
		console.log('currentUrl', currentUrl)
		console.log('currentUrl', currentUrl === 'https://app.qaing.co')

		chrome.runtime?.sendMessage({ action: 'getToken' }, (response) => {
			if (response.accessToken) {
				setAccessToken(response.accessToken)
				currentUrl === 'https://app.qaing.co'
					? handleStartStopClick()
					: window.open('https://app.qaing.co/home', '_blank')
			} else {
				alert('로그인이 필요합니다.')
				// if (
				// 	currentUrl === 'https://app.qaing.co' ||
				// 	currentUrl === 'http://localhost:3000' ||
				// 	currentUrl === 'https://accounts.google.com' ||
				// 	currentUrl === 'https://test.qaing.co'
				// ) {
				// 	return
				// }
				window.open('https://app.qaing.co/auth/signup', '_blank')
				// window.location.href = 'https://app.qaing.co/auth/signup'
			}
		})
	}

	useEffect(() => {
		console.log('accessToken', accessToken)
	}, [accessToken])

	return (
		<section className="fixed left-4 bottom-10 w-[247px] h-[240px] z-50">
			{/* <h1>Screen Recorder</h1> */}
			<div className="flex flex-row ">
				<div className="flex flex-row w-[246px] h-[80px] bg-[#585858] rounded-full">
					<div className="w-[64px] h-[64px] bg-white rounded-full flex flex-row items-center justify-center m-2">
						<div className="flex flex-row items-center justify-center ">
							<button
								className="bg-[#E95050] w-[24px] h-[24px] m-auto rounded-sm"
								onClick={isLogin}
							>
								{recording ? '' : ''}
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
								<p>{`${Math.floor(time / 60)
									.toString()
									.padStart(2, '0')}:${(time % 60)
									.toString()
									.padStart(2, '0')}`}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}

export default Recorder
