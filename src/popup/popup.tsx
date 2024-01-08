import React from 'react'
import { createRoot } from 'react-dom/client'
// import './popup.css'

const App: React.FC<{}> = () => {
  return (
    <div>
      <img src='icon.png' />
    </div>
  )
}

const container = document.createElement('div')
container.id = 'root_qaing'
document.body.appendChild(container)
const root = createRoot(container)
root.render(<App />)
