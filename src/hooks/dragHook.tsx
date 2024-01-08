import React, { useEffect, useRef, useState } from 'react'

export function useDragHook(ref: React.RefObject<HTMLDivElement>) {
	const [position, setPosition] = useState({
		x: 0,
		y: 0,
	})
	const [isDragging, setIsDragging] = useState(false)
	const positionRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 })
	const animationFrameId = useRef<number | null>(null)

	const updatePosition = () => {
		setPosition({
			x: positionRef.current.x,
			y: positionRef.current.y,
		})
	}

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault()
		setIsDragging(true)
		document.body.style.cursor = 'grabbing'
		positionRef.current.x = position.x
		positionRef.current.y = position.y

		positionRef.current.startX = e.clientX
		positionRef.current.startY = e.clientY
	}

	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging) return
		e.preventDefault()

		document.body.style.cursor = 'grabbing'

		// x좌표, y좌표 이동 값
		const deltaX = positionRef.current.startX - e.clientX
		const deltaY = positionRef.current.startY - e.clientY

		// 현재 위치 + 이동 거리를 더해서 새로운 좌표 계산
		let newX = positionRef.current.x + deltaX
		let newY = positionRef.current.y - deltaY

		// 화면 경계 확인 및 조정
		const screenWidth = window.innerWidth
		const maxY = window.innerHeight - recorderSize.height

		// console.log('maxY: ', maxY)

		// 레코더가 화면 밖으로 나가지 않게 조정.
		newX = Math.min(Math.max(newX, 0), screenWidth - recorderSize.width)
		newY = Math.min(Math.max(newY, 0), maxY)

		positionRef.current.x = newX
		positionRef.current.y = newY
		positionRef.current.startX = e.clientX
		positionRef.current.startY = e.clientY

		animationFrameId.current = requestAnimationFrame(updatePosition)
	}

	const handleMouseUp = () => {
		setIsDragging(false)
		document.body.style.cursor = ''

		// 위치 저장
		const newPosition = { x: positionRef.current.x, y: positionRef.current.y }
		chrome.storage.local.set({ recorderPosition: newPosition })

		if (animationFrameId.current) {
			cancelAnimationFrame(animationFrameId.current)
		}
	}

	useEffect(() => {
		if (isDragging) {
			document.body.style.cursor = 'grabbing'
			window.addEventListener('mousemove', handleMouseMove as any)
			window.addEventListener('mouseup', handleMouseUp)
		} else {
			document.body.style.cursor = ''
			window.removeEventListener('mousemove', handleMouseMove as any)
			window.removeEventListener('mouseup', handleMouseUp)
		}

		return () => {
			document.body.style.cursor = ''
			if (animationFrameId.current !== null) {
				cancelAnimationFrame(animationFrameId.current)
			}
			window.removeEventListener('mousemove', handleMouseMove as any)
			window.removeEventListener('mouseup', handleMouseUp)
		}
	}, [isDragging])

	const [recorderSize, setRecorderSize] = useState({ width: 0, height: 0 })

	useEffect(() => {
		// 레코더 요소의 크기를 읽어 상태에 저장
		if (ref.current) {
			setRecorderSize({
				width: ref.current.offsetWidth,
				height: ref.current.offsetHeight,
			})
		}
	}, [])

	return {
		handleMouseDown,
		handleMouseUp,
		position,
		setPosition,
	}
}
