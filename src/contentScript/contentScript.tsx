import React from 'react'
import ReactDOM from 'react-dom/client'
import '../style/input.css'
import Recorder from './components/Recorder'

const App: React.FC<Record<string, never>> = () => {
	return (
		<>
			<Recorder />
		</>
	)
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.createRoot(root).render(<App />)
