import React from 'react'
import ReactDOM from 'react-dom'
import '../style/input.css'
import { useState, useEffect } from 'react'
// import save from '../static/save2.svg'

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
      <div className='flex flex-row '>
        <div className='flex flex-row w-[246px] h-[80px] bg-[#585858] rounded-full'>
          <div className='w-[64px] h-[64px] bg-white rounded-full flex flex-row items-center justify-center m-2'>
            <div className='flex flex-row items-center justify-center '>
              <button
                className='bg-[#E95050] w-[24px] h-[24px] m-auto rounded-sm'
                onClick={handleStartStopClick}
              >
                {recording ? '정지' : ''}
              </button>
            </div>
          </div>
          <div className='flex flex-row items-center justify-center'>
            <div className='bg-white rounded-full w-[155.4px] h-[63.5px]'>
              <div className='flex flex-row items-center justify-around'>
                <img src={require('../static/save2.svg').default} alt='save' />
                <div>이슈저장</div>
              </div>
            </div>
          </div>
        </div>

        {videoURL && (
          <>
            <video controls src={videoURL} width='400'></video>
            <br />
            <button onClick={handleDownloadClick}>Download</button>
          </>
        )}
      </div>
    </section>
  )
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.render(<App />, root)
