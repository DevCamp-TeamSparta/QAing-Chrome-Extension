import React from 'react'
import RecordStartButton from '../../../../static/svg/RecordStartButton'

type RecordButtonProps = {
	isActive?: boolean
}

export default function index({ isActive }: RecordButtonProps) {
	return (
		<div className={'flex items-center justify-center'}>
			<RecordStartButton />
		</div>
	)
}
