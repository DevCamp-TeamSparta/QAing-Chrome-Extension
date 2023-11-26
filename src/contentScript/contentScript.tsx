import React from 'react'
import ReactDOM from 'react-dom'
import '../style/input.css'
import Recorder from './components/Recorder'

const App: React.FC<{}> = () => {
  return (
    <>
      <Recorder />
    </>
  )
}

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.render(<App />, root)
