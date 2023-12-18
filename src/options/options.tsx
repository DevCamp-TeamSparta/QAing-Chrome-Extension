import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../style/input.css'
import axios from 'axios'

const App: React.FC<{}> = () => {
	const [recording, setRecording] = useState(false)
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
	const [recordedChunks, setRecordedChunks] = useState<Blob>()
	const [videoURL, setVideoURL] = useState<string | null>(null)

	//유적 FolderID
	const [folderId, setFolderId] = useState<string>('')
	//타임스탬프
	const [timeRecords, setTimeRecords] = useState<number[]>([])

	const backServer = process.env.PUBLIC_BACKEND_API_URL
	const frontServer = process.env.PUBLIC_FONTEND_URL

	useEffect(() => {})

	//페이지 랜딩되자마자 페이지 녹화시작
	useEffect(() => {
		setRecording(true)
		if (recording) {
			//녹화시작함수
			startRecording()

			// 1시간 후에 녹화 중단
			const timer = setTimeout(() => {
				stopRecording()
			}, 3600000)
			return () => clearTimeout(timer)
		}
		if (!recording) {
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
			//타이머시작함수
			startTimer()

			setMediaStream(stream)
		})
	}

	const stopRecording = () => {
		if (mediaRecorder) {
			mediaRecorder.stop()
			if (mediaStream) {
				mediaStream.getTracks().forEach((track) => track.stop())
				console.log(' options 4: 녹화중지 함수 실행완료')
				stopTimer()
				setRecording(false)
			}
			setRecording(false)
		}
	}

	const handleStartStop = () => {
		setRecording((prev) => !prev)
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

	const [optionsStopRecording, setOptionsStopRecording] = useState(false)

	//contentScript => background = > options
	useEffect(() => {
		const stopRecordingFromBackground = (request: any) => {
			if (request.action === 'stopRecordingToOptions') {
				setOptionsStopRecording(true)
				console.log(' options: 녹화중지 요청 수신완료')
				setTimeRecords(request.timeRecords)
				console.log('options: 타임스탬프 저장시도')

				// console.log('deacive')
				// chrome.runtime.sendMessage({ command: 'deActive' })
			}
		}
		chrome.runtime.onMessage.addListener(stopRecordingFromBackground)

		return () => {
			chrome.runtime.onMessage.removeListener(stopRecordingFromBackground)
		}
	}, [])

	const startTimer = () => {
		// chrome.runtime.sendMessage({ command: 'startTimer' })
		chrome.runtime.sendMessage({ action: 'toggleRecording' })

		// background 녹화 상태 토글 메시지 전송
	}

	const stopTimer = () => {
		chrome.runtime.sendMessage({ command: 'stopTimer' })
		// setTime(0)
	}

	useEffect(() => {
		console.log(' options 2: 녹화중지 요청 수신완료')
		stopRecording()
		console.log(' options 3: 녹화중지 함수 실행완료')
	}, [optionsStopRecording])

	useEffect(() => {
		console.log('options: 타임스탬프 저장완료', timeRecords)
	}, [timeRecords])

	//s3버킷에 저장시키는 함수
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
				.put(`${backServer}/videos/process/${usersFolderId}`, formData, {
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
			.get(`${backServer}/videos/process`, {
				withCredentials: true,
			})
			.then((response) => {
				// 서버로부터의 응답 처리
				console.log('응답성공 몽고DB ID 저장 시작', response)
				const UsersfolderId = response.data.folderId
				setFolderId(UsersfolderId)
			})
			.catch((error) => {
				'몽고db id를 가져오지 못했습니다.'
			})
	}

	//녹화가 종료되고 chunks가 생성되면 mongoDB에 저장소 doc을 만들고 그 doc의 id를 response로 받아옴
	useEffect(() => {
		if (recordedChunks) {
			// onSubmitVideo(recordedChunks, timeRecords)
			onSubmitGetId()
		}
	}, [recordedChunks])

	//mongoDB에서 id를 받아오면 s3버킷에 영상 저장 요청 보냄
	useEffect(() => {
		console.log('folderId', folderId)
		const usersFolderId = folderId
		if (folderId === '') return
		if (!recordedChunks) return
		onSubmitVideo(recordedChunks, timeRecords, usersFolderId)
		// window.location.href = `${frontServer}/${usersFolderId}/issues`
	}, [folderId])

	return (
		<div>
			<div>옵션페이지 확인</div>
			<div className="w-[300px] h-[720px] bg-gray-200 text-xl">
				옵션페이지 확인
				<button
					onClick={handleStartStop}
					className=" text-2xl font-white bg-blue-300  "
				>
					{recording ? '녹화 종료' : '녹화 시작'}
				</button>
				{videoURL && (
					<>
						<video controls src={videoURL} width="400"></video>
						<br />
						{recordedChunks && (
							<button onClick={() => handleDownloadClick(recordedChunks)}>
								Download
							</button>
						)}
					</>
				)}
			</div>
		</div>
	)
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
