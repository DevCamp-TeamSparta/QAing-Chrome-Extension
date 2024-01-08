import React from 'react'
import clsx from 'clsx'
import TooltipArrowDown from '../../../../static/svg/TooltipArrowDown'

interface Props {
	isAbove: boolean
}
export function IssueSaveKeymap({ isAbove }: Props) {
	return (
		<div
			className={clsx('absolute flex items-center', {
				'translate-y-full pt-1 flex-col-reverse': isAbove,
				'-translate-y-full pb-1 flex-col': !isAbove,
			})}
		>
			<div className={'px-3 py-[6px] bg-[#000000cc] rounded-[8px]'}>
				<p className={'b4 m-0 text-white whitespace-nowrap'}>
					ctrl(cmd) +shift + F
				</p>
			</div>
			<div
				className={`flex items-center justify-center origin-center ${
					isAbove ? 'rotate-180' : 'rotate-0'
				}`}
			>
				<TooltipArrowDown />
			</div>
		</div>
	)
}
