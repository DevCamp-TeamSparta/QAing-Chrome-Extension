import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../style/input.css'

const App: React.FC<{}> = () => {
	const [recording, setRecording] = useState(false)
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
	const [recordedChunks, setRecordedChunks] = useState<Blob>()
	const [videoURL, setVideoURL] = useState<string | null>(null)

	useEffect(() => {})

	//페이지 랜딩되자마자 페이지 녹화시작
	useEffect(() => {
		setRecording(true)
		if (recording) {
			startRecording()
			const timer = setTimeout(() => {
				stopRecording()
			}, 3600000) // 1시간 후에 녹화 중단
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

			setMediaStream(stream)
		})
	}

	const stopRecording = () => {
		if (mediaRecorder) {
			mediaRecorder.stop()
			if (mediaStream) {
				mediaStream.getTracks().forEach((track) => track.stop())
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
