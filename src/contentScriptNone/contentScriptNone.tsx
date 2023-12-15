import React from 'react'
import ReactDOM from 'react-dom/client'
import '../style/input.css'

const App: React.FC = () => {
	return (
		<>
			<div className="fixed z-101 w-[500px] h-[500px] text-xl left-4 bottom-10 ">
				논스크립트
			</div>
		</>
	)
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
