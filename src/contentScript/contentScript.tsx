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

	useEffect(() => {
		// 활성화 상태를 가져옵니다.
		chrome.storage.local.get(['isActive'], (result) => {
			setIsActive(result.isActive)
		})

		// 스토리지 변경 리스너를 설정합니다.
		const handleStorageChange = (
			changes: { [key: string]: chrome.storage.StorageChange },
			area: string,
		) => {
			if (area === 'local' && changes.isActive) {
				setIsActive(changes.isActive.newValue)
			}
		}

		chrome.storage.onChanged.addListener(handleStorageChange)

		// 컴포넌트 언마운트 시 리스너를 제거합니다.
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange)
		}
	}, [])

	return <>{isActive && <Recorder />}</>
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
