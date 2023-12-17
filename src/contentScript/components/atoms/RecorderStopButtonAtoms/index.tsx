import React from 'react'

type RecordButtonProps = {
	isActive?: boolean
}

export default function index() {
	return (
		<div>
			<svg
				width="36"
				height="36"
				viewBox="0 0 36 36"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<rect
					x="1"
					y="1"
					width="34"
					height="34"
					rx="17"
					stroke="white"
					stroke-width="2"
				/>
				<rect x="10" y="10" width="16" height="16" rx="2" fill="#FF5847" />
			</svg>
		</div>
	)
}
