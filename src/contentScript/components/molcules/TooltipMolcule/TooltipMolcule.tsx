import React, { useEffect, useState } from 'react'
import { TooltipRecord } from '../../atoms/svgAtoms/TooltipRecord'
import { TooltipSave } from '../../atoms/svgAtoms/TooltipSave'

export default function TooltipMolcule() {
	const [isTooltipRecordActivated, setIsTooltipRecordActivated] =
		useState(false)
	const [isTooltipSaveActivated, setIsTooltipSaveActivated] = useState(false)
	const [tooltipRecordFadeout, setTooltiRecordFadeout] = useState(false)
	const [tooltipSaveFadeout, setTooltipSaveFadeout] = useState(false)

	useEffect(() => {
		const timer1 = setTimeout(() => {
			// setIsTooltipRecordActivated(true)
			chrome.storage.local.get(['isTooltipRecordActivated'], (result) => {
				if (result.isTooltipRecordActivated) return
				chrome.storage.local.set({ isTooltipRecordActivated: true })
				setIsTooltipRecordActivated(true)
			})
		}, 0)

		const timer2 = setTimeout(() => {
			setIsTooltipRecordActivated(false)
			setTooltiRecordFadeout(false)
			chrome.storage.local.get(['isTooltipSaveActivated'], (result) => {
				if (result.isTooltipSaveActivated) return
				chrome.storage.local.set({ isTooltipSaveActivated: true })
				setIsTooltipSaveActivated(true)
			})
		}, 5400)

		const timer3 = setTimeout(() => {
			setIsTooltipSaveActivated(false)
			setTooltipSaveFadeout(false)
		}, 9900)

		const fadeoutTimer1 = setTimeout(() => {
			setTooltiRecordFadeout(true)
		}, 4800)

		const fadeoutTimer2 = setTimeout(() => {
			setTooltipSaveFadeout(true)
		}, 9300)

		return () => {
			clearTimeout(timer1)
			clearTimeout(timer2)
			clearTimeout(timer3)
			clearTimeout(fadeoutTimer1)
			clearTimeout(fadeoutTimer2)
		}
	}, [])

	return (
		<div className="fixed right-[40px] top-[100px] z-[9999]">
			{isTooltipRecordActivated ? (
				<div
					className={`animate-fadeIn  ${
						tooltipRecordFadeout ? 'animate-fadeOut' : ''
					}`}
				>
					<TooltipRecord />
				</div>
			) : (
				<div></div>
			)}
			{isTooltipSaveActivated ? (
				<div
					className={`animate-fadeIn ${
						tooltipSaveFadeout ? ' animate-fadeOut' : ''
					}`}
				>
					<TooltipSave />
				</div>
			) : (
				<div></div>
			)}
		</div>
	)
}
