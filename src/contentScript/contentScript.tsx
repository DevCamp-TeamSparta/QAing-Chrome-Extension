import React from 'react'
import ReactDOM from 'react-dom'
import '../style/input.css'
import { useState, useEffect } from 'react'

const App: React.FC<{}> = () => {
  const [recording, setRecording] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [recordedChunks, setRecordedChunks] = useState([])
  const [videoURL, setVideoURL] = useState(null)

  useEffect(() => {
    if (recording) {
      // 미디어 스트림 획득
      navigator.mediaDevices
        .getDisplayMedia({ video: true })
        .then((stream: any) => {
          setMediaStream(stream)
          const recorder = new MediaRecorder(stream)
          setMediaRecorder(recorder)

          const chunks = []
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data)
              setRecordedChunks(chunks)
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

  const handleStartStopClick = () => {
    setRecording((prevRecording) => !prevRecording)
  }

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
  return (
    <section className='fixed left-4 bottom-10 w-[240px] h-[240px] bg-white z-50'>
      <h1>Screen Recorder</h1>
      <button onClick={handleStartStopClick}>
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {videoURL && (
        <>
          <video controls src={videoURL} width='400'></video>
          <br />
          <button onClick={handleDownloadClick}>Download</button>
        </>
      )}
    </section>
  )
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.render(<App />, root)
