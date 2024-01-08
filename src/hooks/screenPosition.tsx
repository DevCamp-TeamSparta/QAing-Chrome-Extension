import React, { useState, useEffect } from 'react'

const useIsAboveScreenPosition = (
	ref: React.RefObject<HTMLDivElement>,
	position: number,
	dependency: Array<any>,
) => {
	const [isAbove, setIsAbove] = useState(false)

	const checkIfAbove = () => {
		const top = ref.current ? ref.current.getBoundingClientRect().top : 0
		setIsAbove(top < position)
	}

	useEffect(() => {
		checkIfAbove() // 초기 위치 확인
	}, [ref, ...dependency])

	return isAbove
}

export default useIsAboveScreenPosition
