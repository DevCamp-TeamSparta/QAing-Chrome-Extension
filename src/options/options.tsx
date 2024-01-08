import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../style/input.css'
import axios from 'axios'
import Logo from '../contentScript/components/atoms/logo'
import { OptionRecommend } from './svg/OptionRecommend'
import { IsRecording } from './svg/IsRecording'
import { Warning } from './svg/Warning'

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
	//몽고db에서 id를 받아오고 onSubmit을 한다음 바로 window.close()를 실항하기위한 상태값
	const [isWindowClose, setIsWindowClose] = useState<boolean>(false)

	const backServer = process.env.PUBLIC_BACKEND_API_URL
	const frontServer = process.env.PUBLIC_FRONTEND_URL

	useEffect(() => {})

	//페이지 랜딩되자마자 페이지 녹화시작
	useEffect(() => {
		setRecording(true)
		if (recording) {
			//녹화시작함수
			startRecording()

			// 1시간 후에 녹화 중단
			const timer = setTimeout(() => {
				console.log('타이머 최대시간 확인')
				stopTimer()
				chrome.runtime.sendMessage({ action: 'stopRecordingToBackgournd' })
				chrome.storage.local.set({ isActive: false })
				chrome.storage.local.set({ isPlaying: false })
			}, 3601000)
			return () => clearTimeout(timer)
		}
		if (!recording) {
			stopRecording()
		}
	}, [recording])

	const startRecording = () => {
		navigator.mediaDevices
			.getDisplayMedia({
				video: {
					displaySurface: ['monitor', 'window', 'browser'],
				},
			})
			.then((stream) => {
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
			.catch((error) => {
				console.log('사용자 미디어 스트림 취소', error)
				stopRecording()
				chrome.storage.local.set({ isActive: false })
				chrome.storage.local.set({ isPlaying: false })
				//chrome.runtime.sendMessage({ type: 'cancel' })
				window.close()
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
		if (!optionsStopRecording) return
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
			window.open(`${frontServer}/folders/${usersFolderId}/issues`, '_blank')

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
					chrome.storage.local.set({ isActive: false })
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
				console.log('몽고db id를 가져오지 못했습니다.', error)
			})
	}

	//녹화가 종료되고 chunks가 생성되면 mongoDB에 저장소 doc을 만들고 그 doc의 id를 response로 받아옴
	useEffect(() => {
		if (recordedChunks) {
			// onSubmitVideo(recordedChunks, timeRecords)
			if (timeRecords.length === 0) {
				window.close()
				return
			}
			onSubmitGetId()
		}
	}, [recordedChunks])

	//mongoDB에서 id를 받아오면 s3버킷에 영상 저장 요청 보냄
	useEffect(() => {
		console.log('folderId', folderId)
		const usersFolderId = folderId
		if (folderId === '' || folderId === undefined) return
		if (!recordedChunks) return

		const onSubmitVideoData = async () => {
			await onSubmitVideo(recordedChunks, timeRecords, usersFolderId)

			console.log(
				'folder페이지로 이동합니다.',
				`${frontServer}/folders/${usersFolderId}/issues`,
			)
			window.close()
		}

		onSubmitVideoData()
	}, [folderId])

	return (
		<div>
			{/* <div>옵션페이지 확인</div>
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
			</div> */}
			<div className="bg-[#EDFBFB] w-screen h-screen">
				{' '}
				{/* 배경색 설정 */}
				{/* 로고 이미지 */}
				<div className="ml-[101px] pt-[21px]">
					<Logo />
				</div>
				{/* 녹화 전 설명 이미지와 버튼 */}
				{!mediaStream && (
					<div className="flex flex-col items-center justify-center h-screen w-screen">
						<div className="mt-[350px]">
							{/* 위치 조정 */}
							<OptionRecommend />
						</div>
					</div>
				)}
				{/* 녹화 중 UI */}
				{mediaStream && (
					<div className="flex flex-col items-center ">
						{/* 녹화 중 표시 텍스트 */}
						<div className="box-border text-center">
							<h1 className="text-[40px] font-bold leading-[44px]  ">
								녹화 중이에요!
							</h1>
							<h1 className="text-[40px] font-bold  leading-[44px] relative bottom-5  ">
								QA를 진행할 화면으로 이동해주세요
							</h1>
							<div className="flex justify-normal items-center relative bottom-[52px]">
								<div className="ml-1">
									<Warning />
								</div>
								<p className="text-[30px] ml-3 font-bold leading-[44px] text-sementic-danger  ">
									녹화 도중 현재 창을 닫으면 녹화가 중지돼요
								</p>
							</div>
						</div>
						<div className="relative bottom-[45px] ">
							<IsRecording />
						</div>
						{/* <button
							onClick={() => {
								setOptionsStopRecording(true)
							}}
							className="t3 bg-[#FF5847] text-white py-6 px-8 rounded-full" // 버튼 스타일 수정
						>
							녹화 중지하기
						</button> */}
					</div>
				)}
			</div>
		</div>
	)
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
