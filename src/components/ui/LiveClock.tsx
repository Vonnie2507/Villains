'use client'

import { useState, useEffect } from 'react'

export function LiveClock() {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    function update() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-AU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  return (
    <span className="text-3xl font-bold text-text-primary font-display tracking-tight tabular-nums">
      {time}
    </span>
  )
}
