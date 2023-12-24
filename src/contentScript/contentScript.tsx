import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import '../style/input.css'
import Recorder from './components/templetes/Recorder'

// const App: React.FC<Record<string, never>> = () => {
// 	return (
// 		<>
// 			<Recorder />
// 		</>
// 	)
// }

const App: React.FC<Record<string, never>> = () => {
	const [isActive, setIsActive] = useState(false)
	const [recorderPosition, setRecorderPosition] = useState({ x: 0, y: 0 })

	// Recorder 존재 여부를 확인하는 리스너 함수
	const checkRecorderListener = (
		message: any,
		sender: any,
		sendResponse: any,
	) => {
		if (message.action === 'checkRecorder') {
			const recorderExists = document.querySelector('.recorder') !== null
			sendResponse({ found: recorderExists })
		}
	}

	useEffect(() => {
		chrome.storage.local.get(['isActive', 'recorderPosition'], (result) => {
			setIsActive(result.isActive)
			if (result.recorderPosition) {
				setRecorderPosition(result.recorderPosition)
			}
			if (result.isActive) {
				const existingRecorder = document.querySelector('.recorder')
				if (existingRecorder) {
					existingRecorder.remove()
				}
			}
		})

		const handleStorageChange = (
			changes: { [key: string]: chrome.storage.StorageChange },
			area: string,
		) => {
			if (area === 'local' && changes.isActive) {
				setIsActive(changes.isActive.newValue)
			}
			if (area === 'local' && changes.recorderPosition) {
				setRecorderPosition(changes.recorderPosition.newValue)
			}
		}

		// 리스너 추가
		chrome.storage.onChanged.addListener(handleStorageChange)
		chrome.runtime.onMessage.addListener(checkRecorderListener)

		// 컴포넌트 언마운트 시 리스너 제거
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange)
			chrome.runtime.onMessage.removeListener(checkRecorderListener)
		}
	}, [])

	return <>{isActive && <Recorder initialPosition={recorderPosition} />}</>
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
