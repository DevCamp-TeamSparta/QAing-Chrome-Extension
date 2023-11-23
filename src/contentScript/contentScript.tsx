import React from 'react'
import ReactDOM from 'react-dom'
import '../style/input.css'

const hello = <div className='bg-blue-200'>hello world</div>

const root = document.createElement('div')
document.body.appendChild(root)
ReactDOM.render(hello, root)
